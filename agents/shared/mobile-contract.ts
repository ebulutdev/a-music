import { isAgentError } from './errors';
import { createId } from './ids';

export type MobileErrorEnvelope = {
  code: string;
  message: string;
  request_id: string;
};

export type MobileResponse<T = unknown> = {
  success: boolean;
  statusCode: number;
  data?: T;
  error?: MobileErrorEnvelope;
};

/**
 * Sanitizes an error message to prevent accidental leakage of stack traces,
 * internal filesystem paths (e.g. C:\Users\... or /var/app/...), API keys,
 * or authorization headers to mobile clients.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'Beklenmeyen bir hata oluştu.';
  }

  let clean = rawMessage;

  // Mask Bearer tokens and API keys
  clean = clean.replace(/bearer\s+[a-z0-9_.-]+/gi, 'Bearer [REDACTED]');
  clean = clean.replace(/([a-zA-Z0-9_-]{24,})/g, (match) => {
    // If it looks like a high-entropy secret, redact
    if (/[A-Z]/.test(match) && /[0-9]/.test(match) && match.length > 30) {
      return '[REDACTED_SECRET]';
    }
    return match;
  });

  // Strip Windows and Linux absolute filesystem paths
  clean = clean.replace(/[a-zA-Z]:\\[^:\n\r]+/g, '[internal_path]');
  clean = clean.replace(/\/(home|var|usr|tmp|app)\/[^ \n\r]+/g, '[internal_path]');

  // Strip internal IP addresses
  clean = clean.replace(/\b(127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|169\.254\.\d+\.\d+)\b/g, '[internal_ip]');

  return clean.trim();
}

/**
 * Generates an asynchronous 202 Accepted response for mobile generation requests.
 * The mobile client receives the generationId immediately and polls / listens on updates.
 */
export function formatMobileAccepted(generationId: string): MobileResponse<{
  generation_id: string;
  status: 'queued' | 'running';
}> {
  return {
    success: true,
    statusCode: 202,
    data: {
      generation_id: generationId,
      status: 'queued',
    },
  };
}

/**
 * Generates a clean 200 OK response with normalized mobile data.
 */
export function formatMobileSuccess<T>(data: T): MobileResponse<T> {
  return {
    success: true,
    statusCode: 200,
    data,
  };
}

/**
 * Generates a standardized, safe mobile error envelope.
 */
export function formatMobileError(err: unknown, customRequestId?: string): MobileResponse<never> {
  const reqId = customRequestId || createId('req');
  const code = isAgentError(err) ? err.code : 'INTERNAL_ERROR';
  const rawMsg = err instanceof Error ? err.message : String(err);
  const safeMessage = sanitizeErrorMessage(rawMsg);

  return {
    success: false,
    statusCode: isAgentError(err) ? 400 : 500,
    error: {
      code,
      message: safeMessage,
      request_id: reqId,
    },
  };
}
