/**
 * Firebase / Firestore contract.
 *
 * When a Firebase project is created, read this file top-to-bottom and
 * open every collection listed in FIREBASE_COLLECTIONS. Seed documents
 * must use the IDs in FIREBASE_SEED_IDS so the client and the cloud
 * stay aligned.
 *
 * Rule: every new feature that persists data MUST register its
 * collection, fields, and seed IDs here before UI work ships.
 */

export const FIREBASE_PROJECT_HINT = {
  suggestedProjectId: 'aimusic-vibe',
  firestoreLocation: 'europe-west3',
  storageBucketHint: 'aimusic-vibe.appspot.com',
} as const;

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'timestamp'
  | 'string[]'
  | 'map'
  | 'ref';

export type CollectionField = {
  name: string;
  type: FieldType;
  required: boolean;
  note: string;
};

export type FirebaseCollection = {
  name: string;
  description: string;
  documentIdStrategy: string;
  fields: readonly CollectionField[];
  indexes: readonly string[];
};

export const FIREBASE_COLLECTIONS = {
  users: {
    name: 'users',
    description: 'Auth-linked profile for generation quotas and preferences.',
    documentIdStrategy: 'Firebase Auth uid, or local_{uuid} before auth.',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'Same as document id.' },
      { name: 'displayName', type: 'string', required: true, note: 'Public name.' },
      { name: 'locale', type: 'string', required: true, note: 'tr | en' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
      { name: 'updatedAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['createdAt'],
  },
  sessions: {
    name: 'sessions',
    description:
      'Reserved for restoring an in-progress create/vocal composer. Not written by agents yet — do not skip when opening Firestore.',
    documentIdStrategy: 'ses_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'ses_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'prompt', type: 'string', required: true, note: 'Composer text.' },
      { name: 'mode', type: 'string', required: true, note: 'guide | custom | vocal' },
      { name: 'voiceProfileIds', type: 'string[]', required: true, note: 'voice_profiles ids.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'createdAt'],
  },
  voice_profiles: {
    name: 'voice_profiles',
    description: 'Named vocal personas shown as chips on the vocal screen.',
    documentIdStrategy: 'voice_{slug} for seeds, voice_{uuid} for user voices.',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'voice_{slug|uuid}' },
      { name: 'handle', type: 'string', required: true, note: '@Wren style handle without @ stored separately? store bare: Wren' },
      { name: 'kind', type: 'string', required: true, note: 'persona | recording' },
      { name: 'avatarTone', type: 'string', required: true, note: 'CSS tone key.' },
      { name: 'userId', type: 'ref', required: false, note: 'Owner if custom.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['kind', 'userId'],
  },
  audio_clips: {
    name: 'audio_clips',
    description: 'Recorded or uploaded vocal / sample blobs metadata.',
    documentIdStrategy: 'clip_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'clip_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'voiceProfileId', type: 'ref', required: false, note: 'voice_profiles/{id}' },
      { name: 'purpose', type: 'string', required: true, note: 'vocal | beat | mashup | cover | sample' },
      { name: 'mimeType', type: 'string', required: true, note: 'audio/webm | audio/mpeg' },
      { name: 'durationMs', type: 'number', required: true, note: 'Measured length.' },
      { name: 'storagePath', type: 'string', required: true, note: 'Firebase Storage path or local blob url.' },
      { name: 'publicUrl', type: 'string', required: false, note: 'HTTPS url for Suno uploadUrl.' },
      { name: 'waveform', type: 'string[]', required: true, note: 'Normalized 0-1 peaks.' },
      { name: 'label', type: 'string', required: true, note: 'Saved take display name, e.g. Wren.' },
      { name: 'selected', type: 'boolean', required: true, note: 'Attached to the current session.' },
      { name: 'autotone', type: 'string', required: false, note: 'Applied autotone preset id.' },
      { name: 'ready', type: 'boolean', required: true, note: 'Spectrum + autotone finished.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'purpose', 'createdAt'],
  },
  styles: {
    name: 'styles',
    description: 'Reusable genre / style strings for customMode generate.',
    documentIdStrategy: 'style_{slug}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'style_{slug}' },
      { name: 'label', type: 'string', required: true, note: 'UI label.' },
      { name: 'promptFragment', type: 'string', required: true, note: 'Sent to Suno style field.' },
      { name: 'accent', type: 'string', required: true, note: 'Wrapped color token.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['label'],
  },
  lyrics: {
    name: 'lyrics',
    description: 'Checked / edited lyrics attached to a generation.',
    documentIdStrategy: 'lyr_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'lyr_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'body', type: 'string', required: true, note: 'Exact lyrics when customMode.' },
      { name: 'language', type: 'string', required: true, note: 'tr | en | mixed' },
      { name: 'charCount', type: 'number', required: true, note: 'Cached length for model limits.' },
      { name: 'valid', type: 'boolean', required: true, note: 'Passed lyrics control.' },
      { name: 'issues', type: 'string[]', required: true, note: 'Validation messages.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'valid'],
  },
  lyric_cues: {
    name: 'lyric_cues',
    description: 'Timed LRC karaoke for the İlham story player. Filled from lrclib or a Turkish fallback scaled to the uploaded file.',
    documentIdStrategy: 'cue_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'cue_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'title', type: 'string', required: true, note: 'Track or file title.' },
      { name: 'artist', type: 'string', required: true, note: 'Artist when known.' },
      { name: 'fileName', type: 'string', required: true, note: 'Original upload name.' },
      { name: 'durationMs', type: 'number', required: true, note: 'Audio length.' },
      { name: 'lrc', type: 'string', required: true, note: 'Synced LRC body.' },
      { name: 'source', type: 'string', required: true, note: 'lrclib | lrc-file | fallback' },
      { name: 'language', type: 'string', required: true, note: 'tr | en | mixed' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'createdAt'],
  },
  generations: {
    name: 'generations',
    description: 'Suno tasks: create, cover, mashup, sample, vocal.',
    documentIdStrategy: 'gen_{uuid} locally; store providerTaskId separately.',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'gen_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'kind', type: 'string', required: true, note: 'create | cover | mashup | sample | vocal' },
      { name: 'status', type: 'string', required: true, note: 'queued | running | ready | failed' },
      { name: 'model', type: 'string', required: true, note: 'V5 | V5_5 | suno-v5' },
      { name: 'prompt', type: 'string', required: true, note: 'Idea or lyrics.' },
      { name: 'styleId', type: 'ref', required: false, note: 'styles/{id}' },
      { name: 'styleText', type: 'string', required: false, note: 'Inline style override.' },
      { name: 'lyricsId', type: 'ref', required: false, note: 'lyrics/{id}' },
      { name: 'title', type: 'string', required: false, note: 'Custom title.' },
      { name: 'customMode', type: 'boolean', required: true, note: 'Suno customMode.' },
      { name: 'instrumental', type: 'boolean', required: true, note: 'No vocals.' },
      { name: 'provider', type: 'string', required: true, note: 'suno | mock' },
      { name: 'providerTaskId', type: 'string', required: false, note: 'Remote task id.' },
      { name: 'sourceClipIds', type: 'string[]', required: true, note: 'audio_clips used.' },
      { name: 'voiceProfileIds', type: 'string[]', required: true, note: 'voice_profiles used for vocal/create.' },
      { name: 'error', type: 'string', required: false, note: 'Failure message.' },
      { name: 'startedAt', type: 'timestamp', required: true, note: 'ISO millis.' },
      { name: 'finishedAt', type: 'timestamp', required: false, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'kind', 'status', 'startedAt'],
  },
  songs: {
    name: 'songs',
    description: 'Finished tracks shown in the library list.',
    documentIdStrategy: 'song_{uuid} or song_{slug} for seeds.',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'song_{id}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'generationId', type: 'ref', required: false, note: 'generations/{id}' },
      { name: 'title', type: 'string', required: true, note: 'Display title.' },
      { name: 'artist', type: 'string', required: true, note: 'Display artist / model tag.' },
      { name: 'coverTone', type: 'string', required: true, note: 'CSS cover key.' },
      { name: 'audioUrl', type: 'string', required: false, note: 'Playable url.' },
      { name: 'durationMs', type: 'number', required: true, note: 'Length.' },
      { name: 'kind', type: 'string', required: true, note: 'create | cover | mashup | sample | vocal' },
      { name: 'styleText', type: 'string', required: false, note: 'Applied style.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'createdAt', 'kind'],
  },
  mashups: {
    name: 'mashups',
    description: 'Two-track mashup jobs and results.',
    documentIdStrategy: 'msh_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'msh_{uuid}' },
      { name: 'generationId', type: 'ref', required: true, note: 'generations/{id}' },
      { name: 'leftSongId', type: 'ref', required: true, note: 'songs/{id} or clip.' },
      { name: 'rightSongId', type: 'ref', required: true, note: 'songs/{id} or clip.' },
      { name: 'vocalMode', type: 'string', required: true, note: 'auto_lyrics | exact_lyrics | instrumental' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['generationId'],
  },
  covers: {
    name: 'covers',
    description: 'Upload-and-cover jobs keeping melody, changing style.',
    documentIdStrategy: 'cvr_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'cvr_{uuid}' },
      { name: 'generationId', type: 'ref', required: true, note: 'generations/{id}' },
      { name: 'sourceClipId', type: 'ref', required: true, note: 'audio_clips/{id}' },
      { name: 'audioWeight', type: 'number', required: false, note: '0-1 melody lock.' },
      { name: 'vocalGender', type: 'string', required: false, note: 'm | f | n' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['generationId'],
  },
  samples: {
    name: 'samples',
    description: 'Short clips reused as sample beds for new generations.',
    documentIdStrategy: 'smp_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'smp_{uuid}' },
      { name: 'generationId', type: 'ref', required: true, note: 'generations/{id}' },
      { name: 'sourceClipId', type: 'ref', required: true, note: 'audio_clips/{id}' },
      { name: 'startMs', type: 'number', required: true, note: 'Trim start.' },
      { name: 'endMs', type: 'number', required: true, note: 'Trim end.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['generationId'],
  },
  library_items: {
    name: 'library_items',
    description: 'User library membership — what Assets / list renders.',
    documentIdStrategy: 'lib_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'lib_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'songId', type: 'ref', required: true, note: 'songs/{id}' },
      { name: 'pinned', type: 'boolean', required: true, note: 'Keep at top.' },
      { name: 'addedAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'addedAt', 'songId'],
  },
  playlists: {
    name: 'playlists',
    description: 'Ordered song groups including the shuffle surface.',
    documentIdStrategy: 'pl_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'pl_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'title', type: 'string', required: true, note: 'Playlist name.' },
      { name: 'songIds', type: 'string[]', required: true, note: 'Ordered songs.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId'],
  },
  play_events: {
    name: 'play_events',
    description: 'Listen events for Wrapped / Inspire stats.',
    documentIdStrategy: 'evt_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'evt_{uuid}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'songId', type: 'ref', required: true, note: 'songs/{id}' },
      { name: 'msPlayed', type: 'number', required: true, note: 'Heard duration.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'songId', 'createdAt'],
  },
  settings: {
    name: 'settings',
    description: 'Per-user UI prefs. locale is tr | en for the in-app language switch.',
    documentIdStrategy: 'set_{userId}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'set_{userId}' },
      { name: 'userId', type: 'ref', required: true, note: 'users/{id}' },
      { name: 'locale', type: 'string', required: true, note: 'tr | en' },
      { name: 'updatedAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['userId', 'locale'],
  },
  genres: {
    name: 'genres',
    description: 'Home “discover more genres” mosaic tiles. Catalog content, not user-generated.',
    documentIdStrategy: 'genre_{slug}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'genre_{slug}' },
      { name: 'slug', type: 'string', required: true, note: 'energizing | hiphop | …' },
      { name: 'tagKey', type: 'string', required: true, note: 'i18n key, e.g. home.genrePop' },
      { name: 'imagePath', type: 'string', required: true, note: 'Storage path or local /genre-{slug}.png' },
      { name: 'hero', type: 'boolean', required: true, note: 'Spans two mosaic rows.' },
      { name: 'sortOrder', type: 'number', required: true, note: 'Column fill order.' },
    ],
    indexes: ['sortOrder'],
  },
  agent_logs: {
    name: 'agent_logs',
    description:
      'Structured logs from every agent. Client currently keeps a ring buffer only; ingest to this collection on Firebase connect.',
    documentIdStrategy: 'log_{uuid}',
    fields: [
      { name: 'id', type: 'string', required: true, note: 'log_{uuid}' },
      { name: 'scope', type: 'string', required: true, note: 'vocal | create | suno...' },
      { name: 'level', type: 'string', required: true, note: 'debug | info | warn | error | perf' },
      { name: 'event', type: 'string', required: true, note: 'Action name.' },
      { name: 'data', type: 'map', required: true, note: 'JSON payload.' },
      { name: 'createdAt', type: 'timestamp', required: true, note: 'ISO millis.' },
    ],
    indexes: ['scope', 'level', 'createdAt'],
  },
} as const satisfies Record<string, FirebaseCollection>;

export const FIREBASE_SEED_IDS = {
  users: {
    localDev: 'user_local_dev',
  },
  voice_profiles: {
    wren: 'voice_wren',
    iris: 'voice_iris',
    amara: 'voice_amara',
    audio1: 'voice_audio1',
    kick: 'voice_kick',
    snare: 'voice_snare',
    hat: 'voice_hat',
    loop: 'voice_loop',
  },
  styles: {
    warehouseTechno: 'style_warehouse_techno',
    pop: 'style_pop',
    animeSoundtrack: 'style_anime_soundtrack',
    floatHouse: 'style_float_house',
    indie: 'style_indie',
    darkRnb: 'style_dark_rnb',
  },
  songs: {
    nightDrive: 'song_night_drive',
    harborLights: 'song_harbor_lights',
    glassHour: 'song_glass_hour',
    openCircuit: 'song_open_circuit',
  },
  playlists: {
    repeats: 'pl_repeats',
  },
  library_items: {
    nightDrive: 'lib_night_drive',
    harborLights: 'lib_harbor_lights',
    glassHour: 'lib_glass_hour',
    openCircuit: 'lib_open_circuit',
  },
  audio_clips: {
    wren: 'clip_wren',
    iris: 'clip_iris',
    amara: 'clip_amara',
    audio1: 'clip_audio1',
    kick: 'clip_kick',
    snare: 'clip_snare',
    hat: 'clip_hat',
    loop: 'clip_loop',
  },
  settings: {
    localDev: 'set_user_local_dev',
  },
  genres: {
    energizing: 'genre_energizing',
    hiphop: 'genre_hiphop',
    aggressive: 'genre_aggressive',
    pop: 'genre_pop',
    funk: 'genre_funk',
    nostalgia: 'genre_nostalgia',
    punk: 'genre_punk',
  },
} as const;

export const FIREBASE_OPEN_ORDER = Object.values(FIREBASE_COLLECTIONS).map((c) => c.name);

export function listFirebaseCollections(): string[] {
  return [...FIREBASE_OPEN_ORDER];
}

export function getCollectionContract(name: keyof typeof FIREBASE_COLLECTIONS): FirebaseCollection {
  return FIREBASE_COLLECTIONS[name];
}

/** Firebase Storage / CDN paths. Mock UI uses /public files with the same slugs. */
export const FIREBASE_STORAGE_PATHS = {
  vocalClip: (userId: string, clipId: string) => `audio/vocals/${userId}/${clipId}`,
  beatClip: (userId: string, clipId: string) => `audio/beats/${userId}/${clipId}`,
  songAudio: (songId: string) => `audio/songs/${songId}`,
  storyAudio: (userId: string, cueId: string) => `audio/stories/${userId}/${cueId}`,
  homeTheme: 'art/home/home-theme.png',
  beatArt: 'art/home/beat-art.png',
  vocalArt: 'art/home/vocal-art.png',
  genreArt: (slug: string) => `art/genres/${slug}.png`,
  genrePublic: (slug: string) => `/genre-${slug}.png`,
} as const;

export const FIREBASE_GENRE_SEEDS = [
  { id: FIREBASE_SEED_IDS.genres.energizing, slug: 'energizing', tagKey: 'home.genreEnergizing', hero: true, sortOrder: 0 },
  { id: FIREBASE_SEED_IDS.genres.hiphop, slug: 'hiphop', tagKey: 'home.genreHiphop', hero: false, sortOrder: 1 },
  { id: FIREBASE_SEED_IDS.genres.aggressive, slug: 'aggressive', tagKey: 'home.genreAggressive', hero: false, sortOrder: 2 },
  { id: FIREBASE_SEED_IDS.genres.pop, slug: 'pop', tagKey: 'home.genrePop', hero: false, sortOrder: 3 },
  { id: FIREBASE_SEED_IDS.genres.funk, slug: 'funk', tagKey: 'home.genreFunk', hero: false, sortOrder: 4 },
  { id: FIREBASE_SEED_IDS.genres.nostalgia, slug: 'nostalgia', tagKey: 'home.genreNostalgia', hero: false, sortOrder: 5 },
  { id: FIREBASE_SEED_IDS.genres.punk, slug: 'punk', tagKey: 'home.genrePunk', hero: false, sortOrder: 6 },
] as const;
