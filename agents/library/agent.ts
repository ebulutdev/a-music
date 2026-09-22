import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { readAllLocal, upsertLocal } from '../shared/persist';

const log = createLogger('library');

export type Song = {
  id: string;
  userId: string;
  generationId?: string;
  title: string;
  artist: string;
  coverTone: string;
  audioUrl?: string;
  durationMs: number;
  kind: 'create' | 'cover' | 'mashup' | 'sample' | 'vocal';
  styleText?: string;
  createdAt: number;
  lyrics?: string;
  alignedWords?: Array<{ word: string; startS: number; endS: number; success?: boolean }>;
  waveformData?: number[];
  taskId?: string;
  audioId?: string;
};

export type LibraryItem = {
  id: string;
  userId: string;
  songId: string;
  pinned: boolean;
  addedAt: number;
};

export type LibraryRow = LibraryItem & { song: Song };

const SAMPLE_WAVEFORM = [
  0.18, 0.28, 0.45, 0.72, 0.9, 0.65, 0.4, 0.85, 0.95, 0.6, 0.35, 0.75, 0.88, 0.52, 0.3, 0.65,
  0.82, 0.92, 0.74, 0.48, 0.86, 0.96, 0.62, 0.38, 0.7, 0.85, 0.92, 0.55, 0.4, 0.78, 0.85, 0.45,
  0.25, 0.55, 0.78, 0.92, 0.65, 0.42, 0.8, 0.95, 0.72, 0.38, 0.68, 0.84, 0.9, 0.58, 0.32, 0.74,
  0.88, 0.95, 0.64, 0.4, 0.78, 0.86, 0.5, 0.28, 0.62, 0.8, 0.9, 0.68, 0.44, 0.72, 0.5, 0.2,
];

const SEED_SONGS: Song[] = [
  {
    id: FIREBASE_SEED_IDS.songs.nightDrive,
    userId: FIREBASE_SEED_IDS.users.localDev,
    title: 'Night Drive',
    artist: 'Lumen Coast',
    coverTone: 'table',
    durationMs: 186000,
    kind: 'create',
    createdAt: 1,
    waveformData: SAMPLE_WAVEFORM,
    alignedWords: [
      { word: 'Gece', startS: 0.5, endS: 1.2 },
      { word: 'ışıklarını', startS: 1.25, endS: 2.1 },
      { word: 'yak,\n', startS: 2.15, endS: 3.0 },
      { word: 'ritmin', startS: 3.5, endS: 4.2 },
      { word: 'göğsümde', startS: 4.25, endS: 5.1 },
      { word: 'dur.\n', startS: 5.15, endS: 6.0 },
      { word: 'Bu', startS: 6.5, endS: 7.0 },
      { word: 'ses', startS: 7.05, endS: 7.6 },
      { word: 'bize', startS: 7.65, endS: 8.2 },
      { word: 'ait,\n', startS: 8.25, endS: 9.0 },
      { word: 'kalp', startS: 9.5, endS: 10.1 },
      { word: 'atışıyla', startS: 10.15, endS: 11.0 },
      { word: 'yüksel.\n', startS: 11.05, endS: 12.2 },
      { word: 'Şehir', startS: 12.8, endS: 13.5 },
      { word: 'uyanıyor', startS: 13.55, endS: 14.5 },
      { word: 'yavaş,\n', startS: 14.55, endS: 15.6 },
      { word: 'sözün', startS: 16.0, endS: 16.8 },
      { word: 'içimde', startS: 16.85, endS: 17.8 },
      { word: 'yankı.\n', startS: 17.85, endS: 19.0 },
    ],
  },
  {
    id: FIREBASE_SEED_IDS.songs.harborLights,
    userId: FIREBASE_SEED_IDS.users.localDev,
    title: 'Harbor Lights',
    artist: 'Paqueta Wave',
    coverTone: 'night',
    durationMs: 172000,
    kind: 'cover',
    createdAt: 2,
    waveformData: SAMPLE_WAVEFORM,
    alignedWords: [
      { word: 'I', startS: 0.6, endS: 1.0 },
      { word: 'remember', startS: 1.05, endS: 1.7 },
      { word: 'your', startS: 1.75, endS: 2.1 },
      { word: 'face,\n', startS: 2.15, endS: 2.8 },
      { word: 'when', startS: 3.2, endS: 3.6 },
      { word: 'the', startS: 3.65, endS: 3.9 },
      { word: 'night', startS: 3.95, endS: 4.5 },
      { word: 'was', startS: 4.55, endS: 4.8 },
      { word: 'young.\n', startS: 4.85, endS: 5.6 },
      { word: 'We', startS: 6.0, endS: 6.4 },
      { word: 'were', startS: 6.45, endS: 6.8 },
      { word: 'running', startS: 6.85, endS: 7.5 },
      { word: 'through', startS: 7.55, endS: 7.9 },
      { word: 'the', startS: 7.95, endS: 8.2 },
      { word: 'city,\n', startS: 8.25, endS: 9.1 },
      { word: 'and', startS: 9.6, endS: 9.9 },
      { word: 'I', startS: 9.95, endS: 10.2 },
      { word: 'could', startS: 10.25, endS: 10.7 },
      { word: 'not', startS: 10.75, endS: 11.1 },
      { word: 'let', startS: 11.15, endS: 11.5 },
      { word: 'you', startS: 11.55, endS: 11.9 },
      { word: 'go.\n', startS: 11.95, endS: 12.8 },
    ],
  },
  {
    id: FIREBASE_SEED_IDS.songs.glassHour,
    userId: FIREBASE_SEED_IDS.users.localDev,
    title: 'Glass Hour',
    artist: 'Tellz',
    coverTone: 'car',
    durationMs: 201000,
    kind: 'mashup',
    createdAt: 3,
    waveformData: SAMPLE_WAVEFORM,
    alignedWords: [
      { word: 'Zaman', startS: 0.8, endS: 1.4 },
      { word: 'akıyor', startS: 1.45, endS: 2.1 },
      { word: 'camdan\n', startS: 2.15, endS: 2.9 },
      { word: 'damlalar', startS: 3.3, endS: 4.0 },
      { word: 'gibi,\n', startS: 4.05, endS: 4.7 },
      { word: 'her', startS: 5.1, endS: 5.5 },
      { word: 'vuruşta', startS: 5.55, endS: 6.3 },
      { word: 'yeni', startS: 6.35, endS: 6.8 },
      { word: 'bir', startS: 6.85, endS: 7.1 },
      { word: 'hikaye.\n', startS: 7.15, endS: 8.0 },
    ],
  },
  {
    id: FIREBASE_SEED_IDS.songs.openCircuit,
    userId: FIREBASE_SEED_IDS.users.localDev,
    title: 'Open Circuit',
    artist: 'Northline, Vibe',
    coverTone: 'portrait',
    durationMs: 194000,
    kind: 'sample',
    createdAt: 4,
    waveformData: SAMPLE_WAVEFORM,
    alignedWords: [
      { word: 'Devreler', startS: 0.5, endS: 1.2 },
      { word: 'açık,', startS: 1.25, endS: 1.9 },
      { word: 'enerji', startS: 2.3, endS: 3.0 },
      { word: 'yüksek,\n', startS: 3.05, endS: 3.8 },
      { word: 'ritim', startS: 4.2, endS: 4.8 },
      { word: 'bizi', startS: 4.85, endS: 5.3 },
      { word: 'bağlar.\n', startS: 5.35, endS: 6.2 },
    ],
  },
];

export function seedLibrary(): LibraryRow[] {
  const seeds: Array<{ lib: string; song: Song }> = [
    { lib: FIREBASE_SEED_IDS.library_items.nightDrive, song: SEED_SONGS[0] },
    { lib: FIREBASE_SEED_IDS.library_items.harborLights, song: SEED_SONGS[1] },
    { lib: FIREBASE_SEED_IDS.library_items.glassHour, song: SEED_SONGS[2] },
    { lib: FIREBASE_SEED_IDS.library_items.openCircuit, song: SEED_SONGS[3] },
  ];

  for (const { lib, song } of seeds) {
    upsertLocal(FIREBASE_COLLECTIONS.songs.name, song);
    upsertLocal(FIREBASE_COLLECTIONS.library_items.name, {
      id: lib,
      userId: FIREBASE_SEED_IDS.users.localDev,
      songId: song.id,
      pinned: false,
      addedAt: song.createdAt,
    });
  }

  upsertLocal(FIREBASE_COLLECTIONS.playlists.name, {
    id: FIREBASE_SEED_IDS.playlists.repeats,
    userId: FIREBASE_SEED_IDS.users.localDev,
    title: 'Tekrar tekrar',
    songIds: SEED_SONGS.map((s) => s.id),
    createdAt: 0,
  });

  log.info('library.seed', {
    songs: SEED_SONGS.map((s) => s.id),
    playlist: FIREBASE_SEED_IDS.playlists.repeats,
  });
  return listLibrary(FIREBASE_SEED_IDS.users.localDev);
}

export function listLibrary(userId: string): LibraryRow[] {
  const items = readAllLocal<LibraryItem>(FIREBASE_COLLECTIONS.library_items.name);
  const songs = readAllLocal<Song>(FIREBASE_COLLECTIONS.songs.name);
  if (items.length === 0) return seedLibrary();

  const map = new Map(songs.map((s) => [s.id, s]));
  return items
    .filter((i) => i.userId === userId)
    .map((i) => {
      const song = map.get(i.songId);
      return song ? { ...i, song } : null;
    })
    .filter((row): row is LibraryRow => Boolean(row))
    .sort((a, b) => a.addedAt - b.addedAt);
}

export function addToLibrary(userId: string, songId: string): LibraryItem {
  const exists = readAllLocal<LibraryItem>(FIREBASE_COLLECTIONS.library_items.name).find(
    (i) => i.userId === userId && i.songId === songId,
  );
  if (exists) {
    log.warn('library.duplicate', { userId, songId, id: exists.id });
    return exists;
  }
  const item: LibraryItem = {
    id: createId('lib'),
    userId,
    songId,
    pinned: false,
    addedAt: Date.now(),
  };
  upsertLocal(FIREBASE_COLLECTIONS.library_items.name, item);
  log.info('library.add', { id: item.id, songId });
  return item;
}

export function shuffleIds(ids: string[], salt = Date.now()): string[] {
  const copy = [...ids];
  let seed = salt;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  log.debug('library.shuffle', { count: copy.length });
  return copy;
}

export function recordPlay(userId: string, songId: string, msPlayed: number): void {
  upsertLocal(FIREBASE_COLLECTIONS.play_events.name, {
    id: createId('evt'),
    userId,
    songId,
    msPlayed,
    createdAt: Date.now(),
  });
  log.info('library.play', { songId, msPlayed });
}

export async function timedList(userId: string) {
  return measure('library.list', () => listLibrary(userId), 8);
}
