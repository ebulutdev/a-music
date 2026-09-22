import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { readAllLocal, upsertLocal } from '../shared/persist';
import { getSunoClient } from '../suno/client';
import { checkLyrics } from './lyrics';
import { listStyles, resolveStyle } from './styles';
import type { SunoModel } from '../shared/types';

const log = createLogger('create');

export type CreateInput = {
  userId: string;
  prompt: string;
  customMode: boolean;
  instrumental: boolean;
  model?: SunoModel;
  styleId?: string;
  styleText?: string;
  title?: string;
  lyrics?: string;
  voiceProfileIds?: string[];
  sourceClipIds?: string[];
  kind?: GenerationRecord['kind'];
};

export type GenerationRecord = {
  id: string;
  userId: string;
  kind: 'create' | 'cover' | 'mashup' | 'sample' | 'vocal';
  status: 'queued' | 'running' | 'ready' | 'failed';
  model: SunoModel;
  prompt: string;
  styleId?: string;
  styleText?: string;
  lyricsId?: string;
  title?: string;
  customMode: boolean;
  instrumental: boolean;
  provider: 'suno' | 'mock';
  providerTaskId?: string;
  sourceClipIds: string[];
  voiceProfileIds: string[];
  error?: string;
  startedAt: number;
  finishedAt?: number;
};

export function validateCreate(input: CreateInput): void {
  const prompt = input.prompt.trim();
  if (!input.customMode) {
    if (prompt.length < 3) throw new AgentError('CREATE_PROMPT', 'Prompt çok kısa.');
    if (prompt.length > 3000) throw new AgentError('CREATE_PROMPT_MAX', 'Prompt 3000 karakteri aşamaz.');
    return;
  }
  const style = input.styleText || resolveStyle(input.styleId)?.promptFragment || '';
  if (!style) throw new AgentError('CREATE_STYLE', 'Custom mode stil ister.');
  if (!input.instrumental) {
    const lyrics = checkLyrics(input.lyrics || prompt, input.model ?? 'V6_WILD');
    if (!lyrics.valid) throw new AgentError('CREATE_LYRICS', lyrics.issues.join(' '));
  }
  if (!input.title?.trim()) throw new AgentError('CREATE_TITLE', 'Custom mode başlık ister.');
}

export async function createSong(input: CreateInput): Promise<GenerationRecord> {
  const model = input.model ?? 'V6_WILD';
  validateCreate(input);


  let lyricsId: string | undefined;
  const lyricsBody = input.customMode && !input.instrumental ? input.lyrics || input.prompt : '';
  if (lyricsBody) {
    const checked = checkLyrics(lyricsBody, model);
    lyricsId = createId('lyr');
    upsertLocal(FIREBASE_COLLECTIONS.lyrics.name, {
      id: lyricsId,
      userId: input.userId,
      body: lyricsBody,
      language: checked.language,
      charCount: checked.charCount,
      valid: checked.valid,
      issues: checked.issues,
      createdAt: Date.now(),
    });
    log.info('create.lyrics', { lyricsId, ...checked });
  }

  const style = input.styleText || resolveStyle(input.styleId)?.promptFragment;
  const record: GenerationRecord = {
    id: createId('gen'),
    userId: input.userId,
    kind: input.kind ?? 'create',
    status: 'running',
    model,
    prompt: input.prompt.trim(),
    styleId: input.styleId,
    styleText: style,
    lyricsId,
    title: input.title,
    customMode: input.customMode,
    instrumental: input.instrumental,
    provider: 'suno',
    sourceClipIds: input.sourceClipIds ?? [],
    voiceProfileIds: input.voiceProfileIds ?? [],
    startedAt: Date.now(),
  };

  upsertLocal(FIREBASE_COLLECTIONS.generations.name, record);
  log.info('create.submit', {
    generationId: record.id,
    customMode: record.customMode,
    voices: input.voiceProfileIds ?? [],
    stylesAvailable: listStyles().length,
  });

  const { value: task, ms } = await measure(
    'create.suno',
    () =>
      getSunoClient().generate({
        customMode: input.customMode,
        instrumental: input.instrumental,
        model,
        prompt: input.prompt,
        lyrics: lyricsBody || undefined,
        style,
        title: input.title,
      }),

    9000,
  );

  record.providerTaskId = task.taskId;
  record.status = task.status === 'failed' ? 'failed' : task.status === 'ready' ? 'ready' : 'running';
  record.error = task.error;
  if (record.status === 'ready' || record.status === 'failed') record.finishedAt = Date.now();
  upsertLocal(FIREBASE_COLLECTIONS.generations.name, record);

  if (record.status === 'ready') {
    const songId = createId('song');
    upsertLocal(FIREBASE_COLLECTIONS.songs.name, {
      id: songId,
      userId: input.userId,
      generationId: record.id,
      title: task.title || input.title || input.prompt.slice(0, 32),
      artist: 'Vibe',
      coverTone: 'create',
      audioUrl: task.audioUrl,
      durationMs: 0,
      kind: record.kind,
      styleText: style,
      createdAt: Date.now(),
    });
    const libId = createId('lib');
    upsertLocal(FIREBASE_COLLECTIONS.library_items.name, {
      id: libId,
      userId: input.userId,
      songId,
      pinned: false,
      addedAt: Date.now(),
    });
    log.info('create.library', { songId, libId, seedUser: FIREBASE_SEED_IDS.users.localDev });
  }

  log.perf('create.done', { generationId: record.id, status: record.status, ms });
  return record;
}

export function listGenerations(userId: string): GenerationRecord[] {
  return readAllLocal<GenerationRecord>(FIREBASE_COLLECTIONS.generations.name)
    .filter((g) => g.userId === userId)
    .sort((a, b) => b.startedAt - a.startedAt);
}
