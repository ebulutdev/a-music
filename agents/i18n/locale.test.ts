import { describe, expect, it, beforeEach } from 'vitest';
import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal, readLocal } from '../shared/persist';
import { EN, LOCALES, TR } from './messages';
import {
  assertDictionariesComplete,
  loadLocale,
  saveLocale,
  translate,
  translateError,
} from './locale';
import { AgentError } from '../shared/errors';
import { measure } from '../shared/perf';

describe('i18n agent', () => {
  beforeEach(() => resetAllLocal());

  it('keeps TR and EN keys in lockstep', () => {
    assertDictionariesComplete();
    expect(Object.keys(TR).sort()).toEqual(Object.keys(EN).sort());
    expect(LOCALES).toEqual(['tr', 'en']);
  });

  it('persists locale to settings + users for firebase', () => {
    saveLocale('en');
    const settings = readLocal<{ locale: string }>(
      FIREBASE_COLLECTIONS.settings.name,
      FIREBASE_SEED_IDS.settings.localDev,
    );
    const user = readLocal<{ locale: string }>(FIREBASE_COLLECTIONS.users.name, FIREBASE_SEED_IDS.users.localDev);
    expect(settings?.locale).toBe('en');
    expect(user?.locale).toBe('en');
    expect(loadLocale()).toBe('en');
  });

  it('interpolates and maps agent errors', () => {
    expect(translate('tr', 'create.lyricsOk', { count: 12, lang: 'tr' })).toContain('12');
    expect(translate('en', 'header.cta')).toBe('Start for Free');
    expect(translate('tr', 'header.cta')).toBe('Ücretsiz Başla');
    expect(translateError('en', new AgentError('MASHUP_SAME', 'x'))).toMatch(/cannot mash/i);
  });

  it('translates 80 keys under 4ms', async () => {
    const keys = Object.keys(TR) as Array<keyof typeof TR>;
    const { ms } = await measure(
      'i18n.burst',
      () => {
        for (const key of keys) {
          translate('tr', key);
          translate('en', key);
        }
      },
      4,
    );
    expect(ms).toBeLessThan(8);
  });
});
