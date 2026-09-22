import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS, listFirebaseCollections } from '../../database/firebase-collections';
import { checkLyrics } from '../create/lyrics';
import { validateCreate } from '../create/agent';
import { validateCover } from '../cover/agent';
import { validateMashup } from '../mashup/agent';
import { validateSample } from '../sample/agent';
import { normalizeWaveform } from '../vocal/agent';
import { shuffleIds } from '../library/agent';
import { isAgentError } from '../shared/errors';
import { createLogger } from '../shared/logger';

const log = createLogger('advocate');

export type AdvocateFinding = {
  id: string;
  ok: boolean;
  detail: string;
};

function capture(id: string, fn: () => void): AdvocateFinding {
  try {
    fn();
    return { id, ok: true, detail: 'held' };
  } catch (error) {
    return { id, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function expectThrow(id: string, fn: () => void): AdvocateFinding {
  try {
    fn();
    return { id, ok: false, detail: 'expected AgentError, passed' };
  } catch (error) {
    return { id, ok: isAgentError(error), detail: isAgentError(error) ? error.code : 'wrong-error' };
  }
}

export function runAdvocate(): AdvocateFinding[] {
  const findings: AdvocateFinding[] = [
    capture('firebase.collections.complete', () => {
      const names = listFirebaseCollections();
      const needed = [
        'users',
        'sessions',
        'voice_profiles',
        'audio_clips',
        'styles',
        'lyrics',
        'lyric_cues',
        'generations',
        'songs',
        'mashups',
        'covers',
        'samples',
        'library_items',
        'playlists',
        'play_events',
        'settings',
        'genres',
        'agent_logs',
      ];
      for (const name of needed) {
        if (!names.includes(name)) throw new Error(`missing collection ${name}`);
      }
      if (!FIREBASE_COLLECTIONS.voice_profiles) throw new Error('voice_profiles contract missing');
    }),
    capture('firebase.seed.unique', () => {
      const ids = Object.values(FIREBASE_SEED_IDS).flatMap((group) => Object.values(group));
      if (new Set(ids).size !== ids.length) throw new Error('duplicate seed ids');
      if (!FIREBASE_SEED_IDS.genres.energizing) throw new Error('genre seeds missing');
    }),
    expectThrow('create.empty', () =>
      validateCreate({
        userId: FIREBASE_SEED_IDS.users.localDev,
        prompt: '',
        customMode: false,
        instrumental: false,
      }),
    ),
    expectThrow('mashup.same', () =>
      validateMashup({
        userId: 'u',
        leftUrl: 'https://a',
        rightUrl: 'https://a',
        leftRef: 'a',
        rightRef: 'a',
        vocalMode: 'instrumental',
      }),
    ),
    expectThrow('cover.weight', () =>
      validateCover({
        userId: 'u',
        uploadUrl: 'https://a',
        sourceClipId: 'clip_x',
        customMode: false,
        instrumental: false,
        prompt: 'night jazz cover',
        audioWeight: 4,
      }),
    ),
    expectThrow('sample.trim', () =>
      validateSample({
        userId: 'u',
        sourceClipId: 'clip_x',
        uploadUrl: 'https://a',
        startMs: 900,
        endMs: 100,
        prompt: 'loop this',
      }),
    ),
    capture('lyrics.limit', () => {
      const report = checkLyrics('x'.repeat(6000), 'V5');
      if (report.valid) throw new Error('over-limit lyrics marked valid');
    }),
    capture('vocal.waveform.buckets', () => {
      const wave = normalizeWaveform([0, 1, 0.2, 0.8], 48);
      if (wave.length !== 48) throw new Error(`expected 48 buckets, got ${wave.length}`);
    }),
    capture('library.shuffle.permutation', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const next = shuffleIds(ids, 7);
      if (next.length !== 4) throw new Error('shuffle dropped ids');
      if ([...next].sort().join() !== [...ids].sort().join()) throw new Error('shuffle mutated set');
    }),
  ];

  const failed = findings.filter((f) => !f.ok);
  log.info('advocate.summary', { total: findings.length, failed: failed.length });
  for (const f of failed) log.error('advocate.fail', f);
  return findings;
}
