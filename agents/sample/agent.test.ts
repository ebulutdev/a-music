import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal, readAllLocal } from '../shared/persist';
import { createSample, validateSample } from './agent';

describe('sample agent', () => {
  beforeEach(() => resetAllLocal());

  it('rejects inverted or long trims', () => {
    expect(() =>
      validateSample({
        userId: 'u',
        sourceClipId: 'c',
        uploadUrl: 'https://a',
        startMs: 10,
        endMs: 5,
        prompt: 'loop',
      }),
    ).toThrow();
    expect(() =>
      validateSample({
        userId: 'u',
        sourceClipId: 'c',
        uploadUrl: 'https://a',
        startMs: 0,
        endMs: 40000,
        prompt: 'loop this bed',
      }),
    ).toThrow();
  });

  it('writes samples collection', async () => {
    const result = await createSample({
      userId: FIREBASE_SEED_IDS.users.localDev,
      sourceClipId: 'clip_1',
      uploadUrl: 'https://a/sample.mp3',
      startMs: 400,
      endMs: 2400,
      prompt: 'chop the vocal into a house stab',
    });
    expect(result.sampleId.startsWith('smp_')).toBe(true);
    expect(readAllLocal(FIREBASE_COLLECTIONS.samples.name)).toHaveLength(1);
  });
});
