import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_COLLECTIONS } from '../database/firebase-collections';
import { resetAllLocal, upsertLocal } from '../agents/shared/persist';
import {
  checkConcurrencyLimit,
  checkRateLimit,
  resetRateLimitStore,
} from '../agents/shared/rate-limiter';

describe('Rate Limiting & Concurrency Quota Tests', () => {
  const userId = 'user_quota_test';

  beforeEach(() => {
    resetAllLocal();
    resetRateLimitStore();
  });

  it('allows requests within limit (10 req/min) and blocks when exceeded', () => {
    // 10 requests allowed
    for (let i = 0; i < 10; i += 1) {
      expect(() => checkRateLimit(userId, 10, 60000)).not.toThrow();
    }

    // 11th request blocked
    expect(() => checkRateLimit(userId, 10, 60000)).toThrow(/Müzik üretim kotası aşıldı/i);

    // 50 requests attempt: all blocked
    let blockedCount = 0;
    for (let i = 0; i < 40; i += 1) {
      try {
        checkRateLimit(userId, 10, 60000);
      } catch {
        blockedCount += 1;
      }
    }
    expect(blockedCount).toBe(40);
  });

  it('enforces concurrency limit against simultaneous running jobs', () => {
    // No active jobs: passes
    expect(() => checkConcurrencyLimit(userId, 2)).not.toThrow();

    // 1 active job running: passes
    upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
      id: 'gen_active_1',
      userId,
      status: 'running',
    });
    expect(() => checkConcurrencyLimit(userId, 2)).not.toThrow();

    // 2 active jobs running: limit reached
    upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
      id: 'gen_active_2',
      userId,
      status: 'running',
    });
    expect(() => checkConcurrencyLimit(userId, 2)).toThrow(/Aynı anda en fazla 2 müzik üretimi/i);

    // After 1 job finishes: passes again
    upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
      id: 'gen_active_1',
      userId,
      status: 'ready',
    });
    expect(() => checkConcurrencyLimit(userId, 2)).not.toThrow();
  });
});
