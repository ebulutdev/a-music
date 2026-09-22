import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal, readAllLocal } from '../shared/persist';
import { createSong, validateCreate } from './agent';
import { checkLyrics } from './lyrics';
import { listStyles } from './styles';

describe('create agent', () => {
  beforeEach(() => resetAllLocal());

  it('seeds wrapped-aligned styles with firebase ids', () => {
    const styles = listStyles();
    expect(styles.some((s) => s.id === FIREBASE_SEED_IDS.styles.warehouseTechno)).toBe(true);
    expect(styles.length).toBeGreaterThanOrEqual(5);
  });

  it('blocks empty prompt and huge lyrics', () => {
    expect(() =>
      validateCreate({
        userId: 'u',
        prompt: 'ab',
        customMode: false,
        instrumental: false,
      }),
    ).toThrow();
    expect(checkLyrics('hi', 'V5').valid).toBe(false);
    expect(checkLyrics('x'.repeat(5001), 'V5').valid).toBe(false);
  });

  it('creates a mock song and library row', async () => {
    const start = performance.now();
    const gen = await createSong({
      userId: FIREBASE_SEED_IDS.users.localDev,
      prompt: 'neon rain over the Bosphorus, dark pop',
      customMode: false,
      instrumental: false,
    });
    expect(gen.id.startsWith('gen_')).toBe(true);
    expect(gen.status).toBe('ready');
    expect(readAllLocal(FIREBASE_COLLECTIONS.songs.name).length).toBeGreaterThan(0);
    expect(readAllLocal(FIREBASE_COLLECTIONS.library_items.name).length).toBeGreaterThan(0);
    expect(performance.now() - start).toBeLessThan(80);
  });

  it('custom mode requires style, title and lyrics', () => {
    expect(() =>
      validateCreate({
        userId: 'u',
        prompt: 'verse',
        customMode: true,
        instrumental: false,
        title: 'X',
      }),
    ).toThrow();
  });
});
