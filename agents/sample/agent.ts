import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { upsertLocal } from '../shared/persist';
import { getSunoClient } from '../suno/client';

const log = createLogger('sample');

export type SampleInput = {
  userId: string;
  sourceClipId: string;
  uploadUrl: string;
  startMs: number;
  endMs: number;
  prompt: string;
  title?: string;
};

export function validateSample(input: SampleInput): void {
  if (input.startMs < 0 || input.endMs <= input.startMs) {
    throw new AgentError('SAMPLE_TRIM', 'Örnek aralığı geçersiz.');
  }
  if (input.endMs - input.startMs < 400) {
    throw new AgentError('SAMPLE_SHORT', 'Örnek en az 400ms olmalı.');
  }
  if (input.endMs - input.startMs > 30000) {
    throw new AgentError('SAMPLE_LONG', 'Örnek 30 saniyeyi aşmamalı.');
  }
  if (!input.uploadUrl) throw new AgentError('SAMPLE_URL', 'Kaynak ses yok.');
  if (input.prompt.trim().length < 3) throw new AgentError('SAMPLE_PROMPT', 'Prompt gerekli.');
}

export async function createSample(input: SampleInput) {
  validateSample(input);
  const generationId = createId('gen');
  const sampleId = createId('smp');

  upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
    id: generationId,
    userId: input.userId,
    kind: 'sample',
    status: 'running',
    model: 'V6_WILD',
    prompt: input.prompt,
    title: input.title,
    customMode: false,
    instrumental: false,
    provider: 'suno',
    sourceClipIds: [input.sourceClipId],
    startedAt: Date.now(),
  });

  const { value: task, ms } = await measure(
    'sample.suno',
    () =>
      getSunoClient().generate({
        customMode: false,
        instrumental: false,
        model: 'V6_WILD',
        prompt: `${input.prompt}. Use the uploaded sample mood from ${input.startMs}-${input.endMs}ms.`,
        title: input.title,
      }),
    9000,
  );


  upsertLocal(FIREBASE_COLLECTIONS.samples.name, {
    id: sampleId,
    generationId,
    sourceClipId: input.sourceClipId,
    startMs: input.startMs,
    endMs: input.endMs,
    createdAt: Date.now(),
  });

  log.info('sample.done', { sampleId, generationId, taskId: task.taskId, ms });
  return { sampleId, generationId, task };
}
