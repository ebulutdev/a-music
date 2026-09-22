import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal } from '../shared/persist';
import { AgentError } from '../shared/errors';
import {
  listSavedVocals,
  listVoiceProfiles,
  normalizeWaveform,
  processStepAt,
  saveVocalClip,
  seedVoiceProfiles,
  separateAudioVocals,
  toggleSavedVocal,
} from './agent';


describe('vocal agent', () => {
  beforeEach(() => resetAllLocal());

  it('seeds saved vocal takes with stable firebase clip ids', () => {
    const takes = listSavedVocals();
    expect(takes.map((row) => row.clip.id)).toEqual(
      expect.arrayContaining([
        FIREBASE_SEED_IDS.audio_clips.wren,
        FIREBASE_SEED_IDS.audio_clips.iris,
        FIREBASE_SEED_IDS.audio_clips.amara,
        FIREBASE_SEED_IDS.audio_clips.audio1,
      ]),
    );
    expect(takes.every((row) => row.clip.ready)).toBe(true);
  });

  it('toggles selection on a saved take', () => {
    seedVoiceProfiles();
    const before = listSavedVocals().find((row) => row.clip.id === FIREBASE_SEED_IDS.audio_clips.audio1);
    expect(before?.clip.selected).toBe(false);
    const next = toggleSavedVocal(FIREBASE_SEED_IDS.audio_clips.audio1);
    expect(next.selected).toBe(true);
  });

  it('rejects short recordings', () => {
    expect(() =>
      saveVocalClip({
        userId: FIREBASE_SEED_IDS.users.localDev,
        durationMs: 100,
        mimeType: 'audio/webm',
        storagePath: 'local://x',
        peaks: [0.2],
      }),
    ).toThrow(AgentError);
  });

  it('stores a new Audio take and normalizes waveform in <8ms', () => {
    seedVoiceProfiles();
    const start = performance.now();
    const clip = saveVocalClip({
      userId: FIREBASE_SEED_IDS.users.localDev,
      durationMs: 1200,
      mimeType: 'audio/webm',
      storagePath: 'local://rec',
      peaks: Array.from({ length: 4000 }, (_, i) => Math.sin(i / 8)),
    });
    expect(clip.id.startsWith('clip_')).toBe(true);
    expect(clip.label.startsWith('Audio')).toBe(true);
    expect(clip.waveform).toHaveLength(48);
    expect(performance.now() - start).toBeLessThan(8);
    expect(listVoiceProfiles().some((v) => v.id === clip.voiceProfileId)).toBe(true);
  });

  it('cycles process steps for the live ticker', () => {
    expect(processStepAt(0)).toBe('record');
    expect(processStepAt(1600)).toBe('process');
    expect(processStepAt(3200)).toBe('autotone');
    expect(processStepAt(4800)).toBe('spectrum');
    expect(processStepAt(6400)).toBe('record');
  });

  it('keeps waveform bucket count stable', () => {
    expect(normalizeWaveform([], 48)).toHaveLength(48);
  });

  it('separates vocals and accompaniment using Kie.ai separate-vocals', async () => {
    seedVoiceProfiles();
    await expect(
      separateAudioVocals({
        userId: FIREBASE_SEED_IDS.users.localDev,
      }),
    ).rejects.toThrow(AgentError);

    const result = await separateAudioVocals({
      userId: FIREBASE_SEED_IDS.users.localDev,
      audioUrl: 'https://example.com/mix.mp3',
      type: 'separate_vocal',
    });

    expect(result.generationId.startsWith('gen_')).toBe(true);
    expect(result.task.status).toBe('ready');
    expect(result.task.audioUrl).toBeDefined();
  });
});

