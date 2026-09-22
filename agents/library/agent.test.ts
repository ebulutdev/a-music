import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal } from '../shared/persist';
import { addToLibrary, listLibrary, seedLibrary, shuffleIds, timedList } from './agent';

describe('library agent', () => {
  beforeEach(() => resetAllLocal());

  it('seeds four library rows with stable ids', () => {
    const rows = seedLibrary();
    expect(rows).toHaveLength(4);
    expect(rows[0]?.song.id).toBe(FIREBASE_SEED_IDS.songs.nightDrive);
  });

  it('lists under 8ms and shuffle keeps the set', async () => {
    seedLibrary();
    const { value, withinBudget } = await timedList(FIREBASE_SEED_IDS.users.localDev);
    expect(value).toHaveLength(4);
    expect(withinBudget).toBe(true);
    const ids = value.map((r) => r.songId);
    const shuffled = shuffleIds(ids, 99);
    expect([...shuffled].sort()).toEqual([...ids].sort());
  });

  it('does not duplicate membership', () => {
    seedLibrary();
    const first = addToLibrary(FIREBASE_SEED_IDS.users.localDev, FIREBASE_SEED_IDS.songs.nightDrive);
    const second = addToLibrary(FIREBASE_SEED_IDS.users.localDev, FIREBASE_SEED_IDS.songs.nightDrive);
    expect(first.id).toBe(second.id);
    expect(listLibrary(FIREBASE_SEED_IDS.users.localDev)).toHaveLength(4);
  });
});
