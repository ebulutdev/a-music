import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { upsertLocal } from '../shared/persist';
import { getSunoClient } from '../suno/client';
import type { VocalMode } from '../shared/types';

const log = createLogger('mashup');

export type MashupInput = {
  userId: string;
  leftUrl: string;
  rightUrl: string;
  leftRef: string;
  rightRef: string;
  vocalMode: VocalMode;
  prompt?: string;
  lyrics?: string;
  style?: string;
  title?: string;
};

export function validateMashup(input: MashupInput): void {
  if (!input.leftUrl || !input.rightUrl) throw new AgentError('MASHUP_URLS', 'İki parça gerekli.');
  if (input.leftUrl === input.rightUrl) throw new AgentError('MASHUP_SAME', 'Aynı iki parça karıştırılamaz.');
  if (input.vocalMode === 'exact_lyrics' && !(input.lyrics || '').trim()) {
    throw new AgentError('MASHUP_LYRICS', 'exact_lyrics söz ister.');
  }
  if (input.vocalMode === 'auto_lyrics' && !(input.prompt || '').trim()) {
    throw new AgentError('MASHUP_PROMPT', 'auto_lyrics prompt ister.');
  }
}

export async function createMashup(input: MashupInput) {
  validateMashup(input);
  const generationId = createId('gen');
  const mashupId = createId('msh');

  upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
    id: generationId,
    userId: input.userId,
    kind: 'mashup',
    status: 'running',
    model: 'V6_WILD',
    prompt: input.prompt || input.lyrics || '',
    styleText: input.style,
    title: input.title,
    customMode: input.vocalMode === 'exact_lyrics',
    instrumental: input.vocalMode === 'instrumental',
    provider: 'suno',
    sourceClipIds: [input.leftRef, input.rightRef],
    startedAt: Date.now(),
  });

  const { value: task, ms } = await measure(
    'mashup.suno',
    () =>
      getSunoClient().mashup({
        model: 'V6_WILD',
        uploadUrlList: [input.leftUrl, input.rightUrl],
        vocalMode: input.vocalMode,
        customMode: input.vocalMode === 'exact_lyrics',
        instrumental: input.vocalMode === 'instrumental',
        prompt: input.prompt,
        lyrics: input.lyrics,
        style: input.style,
        title: input.title,
      }),
    9000,
  );


  upsertLocal(FIREBASE_COLLECTIONS.mashups.name, {
    id: mashupId,
    generationId,
    leftSongId: input.leftRef,
    rightSongId: input.rightRef,
    vocalMode: input.vocalMode,
    createdAt: Date.now(),
  });

  log.info('mashup.done', { mashupId, generationId, taskId: task.taskId, ms });
  return { mashupId, generationId, task };
}
