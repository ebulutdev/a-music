import { describe, expect, it, vi } from 'vitest';
import { AgentError } from '../agents/shared/errors';
import {
  calculateJitteredBackoff,
  isRetryableHttpStatus,
  withProviderRetry,
} from '../agents/suno/retry';

describe('Provider Retry Engine Tests', () => {
  it('correctly categorizes retryable vs non-retryable status codes', () => {
    // Transient / Retryable
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(504)).toBe(true);
    expect(isRetryableHttpStatus(408)).toBe(true);

    // Fatal / Non-retryable
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(402)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(422)).toBe(false);
  });

  it('computes exponential backoff with jitter within bounded range', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const delay = calculateJitteredBackoff(attempt, 200, 2000, 0.2);
      expect(delay).toBeGreaterThanOrEqual(160); // base - jitter
      expect(delay).toBeLessThanOrEqual(2400); // max + jitter
    }
  });

  it('retries transient failures and succeeds on subsequent attempt', async () => {
    let callCount = 0;
    const mockOperation = async () => {
      callCount += 1;
      if (callCount < 3) {
        throw new AgentError('KIE_RATE_LIMIT', 'Rate limited, please wait', true);
      }
      return { taskId: 'suno_recovered_123' };
    };

    const retries: number[] = [];
    const result = await withProviderRetry(mockOperation, {
      maxAttempts: 4,
      sleepFn: async (delay) => {
        retries.push(delay);
      },
    });

    expect(callCount).toBe(3);
    expect(retries.length).toBe(2);
    expect(result.taskId).toBe('suno_recovered_123');
  });

  it('immediately rejects non-retryable errors without retrying', async () => {
    let callCount = 0;
    const fatalError = Object.assign(new Error('Unauthorized API Key'), { status: 401 });

    const mockFatalOp = async () => {
      callCount += 1;
      throw fatalError;
    };

    await expect(
      withProviderRetry(mockFatalOp, {
        maxAttempts: 3,
        sleepFn: async () => {},
      }),
    ).rejects.toThrow(/Unauthorized/i);

    // Call count must be exactly 1: no repeated payment/billing charges
    expect(callCount).toBe(1);
  });
});
