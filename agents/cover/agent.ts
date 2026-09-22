import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { upsertLocal } from '../shared/persist';
import { getSunoClient } from '../suno/client';
import { checkLyrics } from '../create/lyrics';
import type { SunoModel } from '../shared/types';
import type { KieCoverModel } from '../suno/types';

const log = createLogger('cover');

export type CoverInput = {
  userId: string;
  uploadUrl: string;
  sourceClipId: string;
  customMode: boolean;
  instrumental: boolean;
  model?: SunoModel | KieCoverModel;
  prompt: string;
  style?: string;
  title?: string;
  vocalGender?: 'm' | 'f';
  audioWeight?: number;
  styleWeight?: number;
  weirdnessConstraint?: number;
  negativeTags?: string;
  personaId?: string;
  personaModel?: 'voice_persona' | 'style_persona';
};


export function validateCover(input: CoverInput): void {
  if (!input.uploadUrl) throw new AgentError('COVER_URL', 'Kapak için kaynak ses gerekli.');
  if (!input.customMode && input.prompt.trim().length < 3) {
    throw new AgentError('COVER_PROMPT', 'Prompt gerekli.');
  }
  if (input.customMode) {
    if (!input.style?.trim() || !input.title?.trim()) {
      throw new AgentError('COVER_CUSTOM', 'Custom cover stil ve başlık ister.');
    }
    if (!input.instrumental) {
      const lyrics = checkLyrics(input.prompt, input.model ?? 'V6_WILD');
      if (!lyrics.valid) throw new AgentError('COVER_LYRICS', lyrics.issues.join(' '));
    }
  }
  if (input.audioWeight != null && (input.audioWeight < 0 || input.audioWeight > 1)) {
    throw new AgentError('COVER_WEIGHT', 'audioWeight 0-1 arasında olmalı.');
  }
}

export async function createCover(input: CoverInput) {
  validateCover(input);
  const model = input.model ?? 'V6_WILD';
  const generationId = createId('gen');

  const coverId = createId('cvr');

  upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
    id: generationId,
    userId: input.userId,
    kind: 'cover',
    status: 'running',
    model,
    prompt: input.prompt,
    styleText: input.style,
    title: input.title,
    customMode: input.customMode,
    instrumental: input.instrumental,
    provider: 'suno',
    sourceClipIds: [input.sourceClipId],
    startedAt: Date.now(),
  });

  const { value: task, ms } = await measure(
    'cover.suno',
    () =>
      getSunoClient().cover({
        uploadUrl: input.uploadUrl,
        customMode: input.customMode,
        instrumental: input.instrumental,
        model,
        prompt: input.prompt,
        style: input.style,
        title: input.title,
        vocalGender: input.vocalGender,
        audioWeight: input.audioWeight,
        styleWeight: input.styleWeight,
        weirdnessConstraint: input.weirdnessConstraint,
        negativeTags: input.negativeTags,
        personaId: input.personaId,
        personaModel: input.personaModel,
      }),
    9000,
  );


  upsertLocal(FIREBASE_COLLECTIONS.covers.name, {
    id: coverId,
    generationId,
    sourceClipId: input.sourceClipId,
    audioWeight: input.audioWeight,
    vocalGender: input.vocalGender,
    createdAt: Date.now(),
  });

  log.info('cover.done', { coverId, generationId, taskId: task.taskId, ms });
  return { coverId, generationId, task };
}
