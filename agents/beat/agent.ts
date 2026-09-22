import { FIREBASE_COLLECTIONS, FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { readAllLocal, readLocal, upsertLocal } from '../shared/persist';
import { getSunoClient } from '../suno/client';
import type { KieMusicModel } from '../suno/types';
import {
  normalizeWaveform,
  validateRecording,
  type AudioClip,
  type VoiceProfile,
} from '../vocal/agent';


const log = createLogger('beat');

export type SavedBeat = {
  clip: AudioClip;
  profile: VoiceProfile;
};

const SEED_BEATS: VoiceProfile[] = [
  {
    id: FIREBASE_SEED_IDS.voice_profiles.kick,
    handle: 'Kick',
    kind: 'recording',
    avatarTone: 'kick',
    createdAt: 11,
  },
  {
    id: FIREBASE_SEED_IDS.voice_profiles.snare,
    handle: 'Snare',
    kind: 'recording',
    avatarTone: 'snare',
    createdAt: 12,
  },
  {
    id: FIREBASE_SEED_IDS.voice_profiles.hat,
    handle: 'Hat',
    kind: 'recording',
    avatarTone: 'hat',
    createdAt: 13,
  },
  {
    id: FIREBASE_SEED_IDS.voice_profiles.loop,
    handle: 'Loop',
    kind: 'recording',
    avatarTone: 'loop',
    createdAt: 14,
  },
];

const SEED_CLIPS: AudioClip[] = [
  {
    id: FIREBASE_SEED_IDS.audio_clips.kick,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.kick,
    purpose: 'beat',
    mimeType: 'audio/mpeg',
    durationMs: 2400,
    storagePath: 'local://saved/kick',
    waveform: normalizeWaveform([0.9, 0.2, 0.85, 0.15]),
    label: 'Kick',
    selected: true,
    ready: true,
    createdAt: 11,
  },
  {
    id: FIREBASE_SEED_IDS.audio_clips.snare,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.snare,
    purpose: 'beat',
    mimeType: 'audio/mpeg',
    durationMs: 1800,
    storagePath: 'local://saved/snare',
    waveform: normalizeWaveform([0.2, 0.8, 0.25, 0.75]),
    label: 'Snare',
    selected: true,
    ready: true,
    createdAt: 12,
  },
  {
    id: FIREBASE_SEED_IDS.audio_clips.hat,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.hat,
    purpose: 'beat',
    mimeType: 'audio/mpeg',
    durationMs: 1200,
    storagePath: 'local://saved/hat',
    waveform: normalizeWaveform([0.3, 0.35, 0.4, 0.32]),
    label: 'Hat',
    selected: false,
    ready: true,
    createdAt: 13,
  },
  {
    id: FIREBASE_SEED_IDS.audio_clips.loop,
    userId: FIREBASE_SEED_IDS.users.localDev,
    voiceProfileId: FIREBASE_SEED_IDS.voice_profiles.loop,
    purpose: 'beat',
    mimeType: 'audio/webm',
    durationMs: 4800,
    storagePath: 'local://saved/loop',
    waveform: normalizeWaveform([0.7, 0.4, 0.8, 0.45]),
    label: 'Loop',
    selected: true,
    ready: true,
    createdAt: 14,
  },
];

function colVoices() {
  return FIREBASE_COLLECTIONS.voice_profiles.name;
}

function colClips() {
  return FIREBASE_COLLECTIONS.audio_clips.name;
}

export function seedBeats(): VoiceProfile[] {
  for (const voice of SEED_BEATS) upsertLocal(colVoices(), voice);
  for (const clip of SEED_CLIPS) {
    if (!readLocal(colClips(), clip.id)) upsertLocal(colClips(), clip);
  }
  log.info('beat.seed', {
    voices: SEED_BEATS.map((v) => v.id),
    clips: SEED_CLIPS.map((c) => c.id),
  });
  return SEED_BEATS;
}

export function listSavedBeats(): SavedBeat[] {
  seedBeats();
  const clips = readAllLocal<AudioClip>(colClips()).filter((c) => c.purpose === 'beat');
  const profiles = new Map(readAllLocal<VoiceProfile>(colVoices()).map((p) => [p.id, p]));
  return clips
    .map((clip) => {
      const profile = clip.voiceProfileId ? profiles.get(clip.voiceProfileId) : undefined;
      if (!profile) return null;
      return { clip, profile };
    })
    .filter((row): row is SavedBeat => Boolean(row))
    .sort((a, b) => a.clip.createdAt - b.clip.createdAt);
}

export function toggleSavedBeat(clipId: string): AudioClip {
  const clip = readLocal<AudioClip>(colClips(), clipId);
  if (!clip || clip.purpose !== 'beat') throw new AgentError('BEAT_MISSING', 'Kayıtlı beat bulunamadı.');
  const next: AudioClip = { ...clip, selected: !clip.selected };
  upsertLocal(colClips(), next);
  log.info('beat.toggle', { clipId, selected: next.selected });
  return next;
}

export function saveBeatClip(input: {
  userId: string;
  durationMs: number;
  mimeType: string;
  storagePath: string;
  publicUrl?: string;
  peaks: number[];
}): AudioClip {
  validateRecording(input.durationMs, input.mimeType);
  const existing = listSavedBeats().filter((row) => row.profile.handle.startsWith('Beat')).length;
  const handle = `Beat${existing + 1}`;
  const profileId = createId('voice');
  const clip: AudioClip = {
    id: createId('clip'),
    userId: input.userId,
    voiceProfileId: profileId,
    purpose: 'beat',
    mimeType: input.mimeType,
    durationMs: input.durationMs,
    storagePath: input.storagePath,
    publicUrl: input.publicUrl,
    waveform: normalizeWaveform(input.peaks),
    label: handle,
    selected: true,
    ready: true,
    createdAt: Date.now(),
  };
  const recordingVoice: VoiceProfile = {
    id: profileId,
    handle,
    kind: 'recording',
    avatarTone: 'loop',
    userId: input.userId,
    createdAt: Date.now(),
  };
  upsertLocal(colVoices(), recordingVoice);
  upsertLocal(colClips(), clip);
  log.info('beat.saved', { clipId: clip.id, voiceId: recordingVoice.id, durationMs: clip.durationMs });
  return clip;
}

export type GenerateInstrumentalBeatInput = {
  userId: string;
  sourceClipId: string;
  uploadUrl: string;
  title: string;
  tags: string;
  negativeTags?: string;
  model?: KieMusicModel;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
};

export function validateInstrumentalBeat(input: GenerateInstrumentalBeatInput): void {
  if (!input.uploadUrl?.trim()) {
    throw new AgentError('BEAT_URL', 'Beat üretimi için vokal ses bağlantısı (upload_url) gereklidir.');
  }
  if (!input.tags?.trim()) {
    throw new AgentError('BEAT_TAGS', 'Beat tarzı ve etiketleri (tags) gereklidir.');
  }
  if (!input.title?.trim()) {
    throw new AgentError('BEAT_TITLE', 'Beat için bir başlık gereklidir.');
  }
}

export async function generateInstrumentalBeat(input: GenerateInstrumentalBeatInput) {
  validateInstrumentalBeat(input);
  const generationId = createId('gen');

  upsertLocal(FIREBASE_COLLECTIONS.generations.name, {
    id: generationId,
    userId: input.userId,
    kind: 'beat',
    status: 'running',
    model: input.model ?? 'V6',
    prompt: input.tags,
    styleText: input.tags,
    title: input.title,
    customMode: true,
    instrumental: true,
    provider: 'suno',
    sourceClipIds: [input.sourceClipId],
    startedAt: Date.now(),
  });

  const { value: task, ms } = await measure(
    'beat.instrumental',
    () =>
      getSunoClient().addInstrumental({
        uploadUrl: input.uploadUrl,
        title: input.title,
        tags: input.tags,
        negativeTags: input.negativeTags,
        model: input.model ?? 'V6',
        vocalGender: input.vocalGender,
        styleWeight: input.styleWeight,
        weirdnessConstraint: input.weirdnessConstraint,
        audioWeight: input.audioWeight,
      }),
    9000,
  );

  const genRecord = readLocal<Record<string, unknown>>(FIREBASE_COLLECTIONS.generations.name, generationId);
  if (genRecord) {
    genRecord.providerTaskId = task.taskId;
    genRecord.status = task.status === 'failed' ? 'failed' : task.status === 'ready' ? 'ready' : 'running';
    if (task.error) genRecord.error = task.error;
    if (genRecord.status === 'ready' || genRecord.status === 'failed') genRecord.finishedAt = Date.now();
    upsertLocal(FIREBASE_COLLECTIONS.generations.name, genRecord);
  }

  if (task.status === 'ready') {
    const songId = createId('song');
    upsertLocal(FIREBASE_COLLECTIONS.songs.name, {
      id: songId,
      userId: input.userId,
      generationId,
      title: task.title || input.title,
      artist: 'Kie AI Beat',
      coverTone: 'beat',
      audioUrl: task.audioUrl,
      durationMs: 0,
      kind: 'beat',
      styleText: input.tags,
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
    log.info('beat.library', { songId, libId, seedUser: FIREBASE_SEED_IDS.users.localDev });
  }

  log.perf('beat.instrumental.done', { generationId, taskId: task.taskId, ms });
  return { generationId, task };
}

