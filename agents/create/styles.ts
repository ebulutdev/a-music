import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { readAllLocal, upsertLocal } from '../shared/persist';
import { createLogger } from '../shared/logger';

const log = createLogger('styles');

export type StylePreset = {
  id: string;
  label: string;
  promptFragment: string;
  accent: string;
  createdAt: number;
};

export const SEED_STYLES: StylePreset[] = [
  {
    id: FIREBASE_SEED_IDS.styles.warehouseTechno,
    label: 'Warehouse Techno',
    promptFragment: 'warehouse techno, analog kick, industrial nightclub',
    accent: 'yellow',
    createdAt: 0,
  },
  {
    id: FIREBASE_SEED_IDS.styles.pop,
    label: 'Pop',
    promptFragment: 'modern pop, bright chorus, radio vocal',
    accent: 'pink',
    createdAt: 0,
  },
  {
    id: FIREBASE_SEED_IDS.styles.animeSoundtrack,
    label: 'Anime Soundtrack',
    promptFragment: 'anime soundtrack, emotional piano, soaring vocal',
    accent: 'green',
    createdAt: 0,
  },
  {
    id: FIREBASE_SEED_IDS.styles.floatHouse,
    label: 'Float House',
    promptFragment: 'float house, airy pads, soft groove',
    accent: 'purple',
    createdAt: 0,
  },
  {
    id: FIREBASE_SEED_IDS.styles.indie,
    label: 'Indie',
    promptFragment: 'indie, dry vocal, guitar shimmer',
    accent: 'orange',
    createdAt: 0,
  },
  {
    id: FIREBASE_SEED_IDS.styles.darkRnb,
    label: 'Dark R&B',
    promptFragment: 'dark rnb, late-night bass, intimate vocal',
    accent: 'purple',
    createdAt: 0,
  },
];

export function seedStyles(): StylePreset[] {
  for (const style of SEED_STYLES) upsertLocal(FIREBASE_COLLECTIONS.styles.name, style);
  log.info('styles.seed', { ids: SEED_STYLES.map((s) => s.id) });
  return listStyles();
}

export function listStyles(): StylePreset[] {
  const rows = readAllLocal<StylePreset>(FIREBASE_COLLECTIONS.styles.name);
  if (rows.length === 0) return seedStyles();
  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

export function resolveStyle(id?: string): StylePreset | undefined {
  if (!id) return undefined;
  return listStyles().find((s) => s.id === id);
}
