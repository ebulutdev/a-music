import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { AgentError } from './errors';
import { readAllLocal } from './persist';

type RateRecord = {
  timestamps: number[];
};

const userRateStore = new Map<string, RateRecord>();

export const DEFAULT_MAX_REQUESTS_PER_MINUTE = 10;
export const DEFAULT_MAX_CONCURRENT_JOBS = 2;

/**
 * Resets the in-memory rate limit store (useful for tests).
 */
export function resetRateLimitStore(): void {
  userRateStore.clear();
}

/**
 * Enforces per-user generation rate limits to protect expensive provider billing.
 */
export function checkRateLimit(
  userId: string,
  maxPerWindow = DEFAULT_MAX_REQUESTS_PER_MINUTE,
  windowMs = 60_000,
): void {
  const now = Date.now();
  let record = userRateStore.get(userId);

  if (!record) {
    record = { timestamps: [] };
    userRateStore.set(userId, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxPerWindow) {
    const oldest = record.timestamps[0];
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    throw new AgentError(
      'RATE_LIMIT_EXCEEDED',
      `Müzik üretim kotası aşıldı (maks. ${maxPerWindow} istek/dk). Lütfen ${retryAfterSec} saniye bekleyin.`,
      true,
    );
  }

  record.timestamps.push(now);
}

/**
 * Enforces per-user concurrency limit so a single user cannot launch
 * dozens of simultaneous background jobs.
 */
export function checkConcurrencyLimit(
  userId: string,
  maxConcurrent = DEFAULT_MAX_CONCURRENT_JOBS,
): void {
  const generations = readAllLocal<{ userId: string; status: string }>(FIREBASE_COLLECTIONS.generations.name);
  const activeJobs = generations.filter(
    (g) => g.userId === userId && (g.status === 'running' || g.status === 'queued'),
  ).length;

  if (activeJobs >= maxConcurrent) {
    throw new AgentError(
      'CONCURRENCY_LIMIT_EXCEEDED',
      `Aynı anda en fazla ${maxConcurrent} müzik üretimi yapabilirsiniz. ` +
        `Şu an ${activeJobs} adet üretiminiz devam ediyor. Lütfen tamamlanmasını bekleyin.`,
      true,
    );
  }
}
