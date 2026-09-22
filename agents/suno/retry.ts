import { isAgentError } from '../shared/errors';

export const RETRYABLE_HTTP_STATUSES = new Set<number>([
  408, // Request Timeout
  429, // Too Many Requests / Rate Limited
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

export const NON_RETRYABLE_HTTP_STATUSES = new Set<number>([
  400, // Bad Request
  401, // Unauthorized
  402, // Payment Required / Insufficient Credits
  403, // Forbidden
  404, // Not Found
  409, // Conflict
  422, // Unprocessable Entity / Validation Error
]);

/**
 * Checks whether an HTTP status code represents a transient error suitable for automatic retry.
 */
export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

/**
 * Computes exponential backoff with full jitter to avoid the thundering herd problem.
 */
export function calculateJitteredBackoff(
  attempt: number,
  baseMs = 300,
  maxMs = 3000,
  jitterRatio = 0.25,
): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = (Math.random() * 2 - 1) * (exponential * jitterRatio);
  return Math.max(baseMs, Math.round(exponential + jitter));
}

export type RetryOptions = {
  maxAttempts?: number;
  baseMs?: number;
  maxMs?: number;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  sleepFn?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Executes an async operation with jittered exponential backoff for transient errors.
 * Rejects immediately on fatal client/validation errors (400, 401, 402, 403, 422).
 */
export async function withProviderRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const sleep = options.sleepFn ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // If error is explicitly non-retryable (e.g., AgentError with retryable=false), break immediately
      if (isAgentError(err) && !err.retryable) {
        throw err;
      }

      // Check if it's an HTTP response error with status
      const maybeStatus = (err as { status?: number; statusCode?: number })?.status ||
                          (err as { statusCode?: number })?.statusCode;

      if (maybeStatus && NON_RETRYABLE_HTTP_STATUSES.has(maybeStatus)) {
        throw err;
      }

      if (attempt === maxAttempts - 1) {
        throw err;
      }

      const delay = calculateJitteredBackoff(attempt, options.baseMs, options.maxMs);
      if (options.onRetry) {
        options.onRetry(err, attempt + 1, delay);
      }
      await sleep(delay);
    }
  }

  throw lastError;
}
