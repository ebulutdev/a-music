import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { readAllLocal, readLocal, upsertLocal } from '../shared/persist';
import { getSunoClient } from '../suno/client';
import type { KieSeparationType } from '../suno/types';


const log = createLogger('vocal');

export type VoiceKind = 'persona' | 'recording';

export type VoiceProfile = {
  id: string;
  handle: string;
  kind: VoiceKind;
  avatarTone: string;
  userId?: string;
  createdAt: number;
};

export type AudioClip = {
  id: string;
  userId: string;
  voiceProfileId?: string;
  purpose: 'vocal' | 'beat' | 'mashup' | 'cover' | 'sample';
  mimeType: string;
  durationMs: number;
  storagePath: string;
  publicUrl?: string;
  waveform: string[];
  label: string;
  selected: boolean;
  autotone?: string;
  ready: boolean;
  createdAt: number;
};

export type SavedVocal = {
  clip: AudioClip;
  profile: VoiceProfile;
};

export type ProcessStep = 'record' | 'process' | 'autotone' | 'spectrum';

export const PROCESS_STEPS: readonly ProcessStep[] = ['record', 'process', 'autotone', 'spectrum'];
export const VOCAL_MAX_MS = 30 * 60 * 1000;

export const SEED_VOICES: VoiceProfile[] = [
  {
    id: FIREBASE_SEED_IDS.voice_profiles.wren,
    handle: 'Wren',
    kind: 'recording',
    avatarTone: 'wren',
    createdAt: 1,
  },
  {
    id: FIREBASE_SEED_IDS.voice_profiles.iris,
    handle: 'Iris',
    kind: 'recording',
    avatarTone: 'iris',
    createdAt: 2,
  },
  {
    id: FIREBASE_SEED_IDS.voice_profiles.amara,
    handle: 'Amara',
    kind: 'recording',
    avatarTone: 'amara',
    createdAt: 3,
  },
  {
    id: FIREBASE_SEED_IDS.voice_profiles.audio1,
    handle: 'Audio1',
    kind: 'recording',
    avatarTone: 'audio',
    createdAt: 4,
  },
];

const SEED_CLIPS: AudioClip[] = [
  {
    id: FIREBASE_SEED_IDS.audio_clips.wren,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.wren,
    purpose: 'vocal',
    mimeType: 'audio/mpeg',
    durationMs: 8200,
    storagePath: 'local://saved/wren',
    publicUrl: 'https://audiostream.kie.ai/stream/sample-vocal.mp3',
    waveform: normalizeWaveform([0.4, 0.7, 0.5, 0.9]),
    label: 'Wren',
    selected: true,
    autotone: 'soft-air',
    ready: true,
    createdAt: 1,
  },
  {
    id: FIREBASE_SEED_IDS.audio_clips.iris,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.iris,
    purpose: 'vocal',
    mimeType: 'audio/mpeg',
    durationMs: 7600,
    storagePath: 'local://saved/iris',
    publicUrl: 'https://audiostream.kie.ai/stream/sample-vocal-female.mp3',
    waveform: normalizeWaveform([0.3, 0.8, 0.4, 0.6]),
    label: 'Iris',
    selected: true,
    autotone: 'silk',
    ready: true,
    createdAt: 2,
  },
  {
    id: FIREBASE_SEED_IDS.audio_clips.amara,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.amara,
    purpose: 'vocal',
    mimeType: 'audio/mpeg',
    durationMs: 9100,
    storagePath: 'local://saved/amara',
    publicUrl: 'https://audiostream.kie.ai/stream/sample-vocal-amara.mp3',
    waveform: normalizeWaveform([0.5, 0.6, 0.9, 0.4]),
    label: 'Amara',
    selected: true,
    autotone: 'warm-gold',
    ready: true,
    createdAt: 3,
  },
  {
    id: FIREBASE_SEED_IDS.audio_clips.audio1,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.audio1,
    purpose: 'vocal',
    mimeType: 'audio/webm',
    durationMs: 5400,
    storagePath: 'local://saved/audio1',
    publicUrl: 'https://audiostream.kie.ai/stream/sample-vocal.mp3',
    waveform: normalizeWaveform([0.2, 0.9, 0.3, 0.8]),
    label: 'Audio1',
    selected: false,
    autotone: 'neutral',
    ready: true,
    createdAt: 4,
  },
];

function colVoices() {
  return FIREBASE_COLLECTIONS.voice_profiles.name;
}

function colClips() {
  return FIREBASE_COLLECTIONS.audio_clips.name;
}

export function normalizeWaveform(peaks: number[], buckets = 48): string[] {
  if (peaks.length === 0) return Array.from({ length: buckets }, () => '0.12');
  const step = Math.max(1, Math.floor(peaks.length / buckets));
  const out: string[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const slice = peaks.slice(i * step, i * step + step);
    const max = slice.reduce((m, n) => Math.max(m, Math.abs(n)), 0.12);
    out.push(Math.min(1, max).toFixed(3));
  }
  return out;
}

export function processStepAt(elapsedMs: number, intervalMs = 1600): ProcessStep {
  const safe = Math.max(0, elapsedMs);
  const index = Math.floor(safe / intervalMs) % PROCESS_STEPS.length;
  return PROCESS_STEPS[index] ?? 'record';
}

export function seedVoiceProfiles(): VoiceProfile[] {
  for (const voice of SEED_VOICES) upsertLocal(colVoices(), voice);
  for (const clip of SEED_CLIPS) {
    if (!readLocal(colClips(), clip.id)) upsertLocal(colClips(), clip);
  }
  log.info('vocal.seed', {
    voices: SEED_VOICES.map((v) => v.id),
    clips: SEED_CLIPS.map((c) => c.id),
  });
  return listVoiceProfiles();
}

export function listVoiceProfiles(): VoiceProfile[] {
  const rows = readAllLocal<VoiceProfile>(colVoices());
  if (rows.length === 0) return seedVoiceProfiles();
  const order = SEED_VOICES.map((v) => v.id);
  return rows.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.createdAt - b.createdAt;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function listSavedVocals(): SavedVocal[] {
  seedVoiceProfiles();
  const clips = readAllLocal<AudioClip>(colClips()).filter((c) => c.purpose === 'vocal');
  const profiles = new Map(listVoiceProfiles().map((p) => [p.id, p]));
  return clips
    .map((clip) => {
      const profile = clip.voiceProfileId ? profiles.get(clip.voiceProfileId) : undefined;
      if (!profile) return null;
      return { clip, profile };
    })
    .filter((row): row is SavedVocal => Boolean(row))
    .sort((a, b) => a.clip.createdAt - b.clip.createdAt);
}

export function toggleSavedVocal(clipId: string): AudioClip {
  const clip = readLocal<AudioClip>(colClips(), clipId);
  if (!clip) throw new AgentError('VOCAL_MISSING', 'Kayıtlı vocal bulunamadı.');
  const next: AudioClip = { ...clip, selected: !clip.selected };
  upsertLocal(colClips(), next);
  log.info('vocal.toggle', { clipId, selected: next.selected });
  return next;
}

export function selectedPersonas(ids: string[]): VoiceProfile[] {
  const all = listVoiceProfiles();
  return all.filter((v) => ids.includes(v.id));
}

export function selectedSavedVocals(): SavedVocal[] {
  return listSavedVocals().filter((row) => row.clip.selected);
}

export function validateRecording(durationMs: number, mimeType: string): void {
  if (durationMs < 400) throw new AgentError('VOCAL_SHORT', 'Kayıt çok kısa.');
  if (durationMs > VOCAL_MAX_MS) throw new AgentError('VOCAL_LONG', 'Yükleme limiti 30 dakika.');
  if (!mimeType.startsWith('audio/')) throw new AgentError('VOCAL_MIME', 'Ses dosyası değil.');
}

export function saveVocalClip(input: {
  userId: string;
  durationMs: number;
  mimeType: string;
  storagePath: string;
  publicUrl?: string;
  peaks: number[];
}): AudioClip {
  validateRecording(input.durationMs, input.mimeType);
  const existing = listSavedVocals().filter((row) => row.profile.handle.startsWith('Audio')).length;
  const handle = `Audio${existing + 1}`;
  const profileId = createId('voice');
  const clip: AudioClip = {
    id: createId('clip'),
    userId: input.userId,
    voiceProfileId: profileId,
    purpose: 'vocal',
    mimeType: input.mimeType,
    durationMs: input.durationMs,
    storagePath: input.storagePath,
    publicUrl: input.publicUrl,
    waveform: normalizeWaveform(input.peaks),
    label: handle,
    selected: true,
    autotone: 'auto-fit',
    ready: true,
    createdAt: Date.now(),
  };

  const recordingVoice: VoiceProfile = {
    id: profileId,
    handle,
    kind: 'recording',
    avatarTone: 'audio',
    userId: input.userId,
    createdAt: Date.now(),
  };

  upsertLocal(colVoices(), recordingVoice);
  upsertLocal(colClips(), clip);
  log.info('vocal.saved', {
    clipId: clip.id,
    voiceId: recordingVoice.id,
    durationMs: clip.durationMs,
    collectionClip: colClips(),
    collectionVoice: colVoices(),
  });
  return clip;
}

export async function timedNormalize(peaks: number[]) {
  return measure('vocal.normalize', () => normalizeWaveform(peaks), 4);
}

export type SeparateVocalsInput = {
  userId: string;
  sourceClipId?: string;
  taskId?: string;
  audioId?: string;
  audioUrl?: string;
  type?: KieSeparationType;
  stemName?: string;
};

export async function separateAudioVocals(input: SeparateVocalsInput) {
  if (!input.audioUrl && !input.taskId) {
    throw new AgentError('VOCAL_SEP_INPUT', 'Ayrıştırma için ya ses URL ya da task ID gereklidir.');
  }

  const generationId = createId('gen');
  upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
    id: generationId,
    userId: input.userId,
    kind: 'vocal',
    status: 'running',
    model: 'V6',
    prompt: input.stemName ? `Stem: ${input.stemName}` : 'Vocal & Instrument separation',
    title: 'Separated Stems',
    customMode: false,
    instrumental: false,
    provider: 'suno',
    sourceClipIds: input.sourceClipId ? [input.sourceClipId] : [],
    startedAt: Date.now(),
  });

  const { value: task, ms } = await measure(
    'vocal.separate',
    () =>
      getSunoClient().separateVocals({
        taskId: input.taskId,
        audioId: input.audioId,
        audioUrl: input.audioUrl,
        type: input.type ?? 'separate_vocal',
        stemName: input.stemName,
      }),
    9000,
  );

  log.info('vocal.separated', { generationId, taskId: task.taskId, ms });
  return { generationId, task };
}

