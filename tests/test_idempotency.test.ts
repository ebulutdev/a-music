import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeRequestFingerprint,
  processIdempotency,
  resetIdempotencyStore,
} from '../agents/shared/idempotency';

describe('Duplicate Generation & Idempotency Tests', () => {
  beforeEach(() => {
    resetIdempotencyStore();
  });

  it('computes deterministic fingerprint for identical requests', () => {
    const p1 = {
      userId: 'user_1',
      kind: 'create',
      prompt: 'cyberpunk synthwave 120 bpm',
      title: 'Neon Tokyo',
      style: 'Synthwave',
    };
    const p2 = {
      userId: 'user_1',
      kind: 'create',
      prompt: '  cyberpunk synthwave 120 bpm  ', // whitespace variance
      title: 'Neon Tokyo',
      style: 'synthwave', // case variance
    };

    const fp1 = computeRequestFingerprint(p1);
    const fp2 = computeRequestFingerprint(p2);

    expect(fp1).toBe(fp2);
  });

  it('detects duplicate request within TTL and returns original record ID', () => {
    const key = 'fp_test_double_tap';

    // 1st request (original)
    const res1 = processIdempotency(key, 'gen_original_123', 15000);
    expect(res1.isDuplicate).toBe(false);
    expect(res1.recordId).toBe('gen_original_123');

    // 2nd request (rapid double-tap or mobile network retry within 15s)
    const res2 = processIdempotency(key, 'gen_second_456', 15000);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.recordId).toBe('gen_original_123'); // Deduped to original generation

    // 3rd request (another retry)
    const res3 = processIdempotency(key, 'gen_third_789', 15000);
    expect(res3.isDuplicate).toBe(true);
    expect(res3.recordId).toBe('gen_original_123');
  });

  it('allows distinct requests with different fingerprints', () => {
    const resA = processIdempotency('fp_song_a', 'gen_a');
    const resB = processIdempotency('fp_song_b', 'gen_b');

    expect(resA.isDuplicate).toBe(false);
    expect(resB.isDuplicate).toBe(false);
    expect(resA.recordId).not.toBe(resB.recordId);
  });
});
