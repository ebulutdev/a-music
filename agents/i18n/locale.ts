import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { createLogger } from '../shared/logger';
import { readLocal, upsertLocal } from '../shared/persist';
import { DICTS, LOCALES, type Locale, type MessageKey, type Vars } from './messages';
import { AgentError } from '../shared/errors';

const log = createLogger('i18n');

export type SettingsRecord = {
  id: string;
  userId: string;
  locale: Locale;
  updatedAt: number;
};

export function isLocale(value: unknown): value is Locale {
  return value === 'tr' || value === 'en';
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'tr';
  const raw = (navigator.language || '').toLowerCase();
  return raw.startsWith('tr') ? 'tr' : raw ? 'en' : 'tr';
}

export function loadLocale(userId = FIREBASE_SEED_IDS.users.localDev): Locale {
  const row = readLocal<SettingsRecord>(
    FIREBASE_COLLECTIONS.settings.name,
    FIREBASE_SEED_IDS.settings.localDev,
  );
  if (row && isLocale(row.locale)) {
    log.debug('i18n.load', { locale: row.locale, id: row.id });
    return row.locale;
  }
  const detected = detectBrowserLocale();
  saveLocale(detected, userId);
  log.info('i18n.detect', { locale: detected, userId });
  return detected;
}

export function saveLocale(locale: Locale, userId = FIREBASE_SEED_IDS.users.localDev): void {
  const record: SettingsRecord = {
    id: FIREBASE_SEED_IDS.settings.localDev,
    userId,
    locale,
    updatedAt: Date.now(),
  };
  upsertLocal(FIREBASE_COLLECTIONS.settings.name, record);
  upsertLocal(FIREBASE_COLLECTIONS.users.name, {
    id: userId,
    displayName: 'Local',
    locale,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  log.info('i18n.save', {
    locale,
    settingsId: record.id,
    collection: FIREBASE_COLLECTIONS.settings.name,
  });
}

export function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] == null ? `{${key}}` : String(vars[key]),
  );
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const table = DICTS[locale] ?? DICTS.tr;
  const raw = table[key] ?? DICTS.tr[key] ?? key;
  if (!table[key]) log.warn('i18n.missing', { locale, key });
  return fill(raw, vars);
}

export function oppositeLocale(locale: Locale): Locale {
  return locale === 'tr' ? 'en' : 'tr';
}

export function styleMessageKey(styleId: string): MessageKey | null {
  const map: Record<string, MessageKey> = {
    [FIREBASE_SEED_IDS.styles.warehouseTechno]: 'style.warehouseTechno',
    [FIREBASE_SEED_IDS.styles.pop]: 'style.pop',
    [FIREBASE_SEED_IDS.styles.animeSoundtrack]: 'style.animeSoundtrack',
    [FIREBASE_SEED_IDS.styles.floatHouse]: 'style.floatHouse',
    [FIREBASE_SEED_IDS.styles.indie]: 'style.indie',
    [FIREBASE_SEED_IDS.styles.darkRnb]: 'style.darkRnb',
  };
  return map[styleId] ?? null;
}

export function errorMessageKey(code: string): MessageKey | null {
  const key = `error.${code}` as MessageKey;
  if (key in DICTS.tr) return key;
  return null;
}

export function translateError(locale: Locale, error: unknown): string {
  if (error instanceof AgentError) {
    const key = errorMessageKey(error.code);
    if (key) return translate(locale, key);
  }
  if (error instanceof Error && error.message) return error.message;
  return translate(locale, 'toast.generic');
}

export function assertDictionariesComplete(): void {
  const keys = Object.keys(DICTS.tr) as MessageKey[];
  for (const locale of LOCALES) {
    for (const key of keys) {
      if (!DICTS[locale][key]) throw new Error(`missing ${locale} ${key}`);
    }
  }
}
