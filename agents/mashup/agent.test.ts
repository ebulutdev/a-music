import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal, readAllLocal } from '../shared/persist';
import { createMashup, validateMashup } from './agent';

describe('mashup agent', () => {
  beforeEach(() => resetAllLocal());

  it('requires two distinct tracks', () => {
    expect(() =>
      validateMashup({
        userId: 'u',
        leftUrl: 'https://a',
        rightUrl: 'https://a',
        leftRef: 'a',
        rightRef: 'b',
        vocalMode: 'instrumental',
      }),
    ).toThrow();
  });

  it('writes mashups collection with msh_ id', async () => {
    const result = await createMashup({
      userId: FIREBASE_SEED_IDS.users.localDev,
      leftUrl: 'https://a/audio.mp3',
      rightUrl: 'https://b/audio.mp3',
      leftRef: FIREBASE_SEED_IDS.songs.nightDrive,
      rightRef: FIREBASE_SEED_IDS.songs.harborLights,
      vocalMode: 'instrumental',
      title: 'Harbor Night',
    });
    expect(result.mashupId.startsWith('msh_')).toBe(true);
    expect(readAllLocal(FIREBASE_COLLECTIONS.mashups.name)).toHaveLength(1);
  });
});
