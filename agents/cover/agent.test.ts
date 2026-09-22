import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal, readAllLocal } from '../shared/persist';
import { createCover, validateCover } from './agent';

describe('cover agent', () => {
  beforeEach(() => resetAllLocal());

  it('rejects invalid audioWeight', () => {
    expect(() =>
      validateCover({
        userId: 'u',
        uploadUrl: 'https://a',
        sourceClipId: 'clip_1',
        customMode: false,
        instrumental: false,
        prompt: 'jazz cover of the hook',
        audioWeight: 2,
      }),
    ).toThrow();
  });

  it('stores cover row under covers collection', async () => {
    const result = await createCover({
      userId: FIREBASE_SEED_IDS.users.localDev,
      uploadUrl: 'https://a/vocal.mp3',
      sourceClipId: 'clip_1',
      customMode: false,
      instrumental: false,
      prompt: 'dream pop cover, airy vocal',
      title: 'Glass Cover',
    });
    expect(result.coverId.startsWith('cvr_')).toBe(true);
    expect(readAllLocal(FIREBASE_COLLECTIONS.covers.name)).toHaveLength(1);
  });
});
