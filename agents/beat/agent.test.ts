import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_SEED_IDS } from '../../database/firebase-collections';
import { resetAllLocal } from '../shared/persist';
import { AgentError } from '../shared/errors';
import {
  generateInstrumentalBeat,
  listSavedBeats,
  saveBeatClip,
  seedBeats,
  toggleSavedBeat,
} from './agent';


describe('beat agent', () => {
  beforeEach(() => resetAllLocal());

  it('seeds saved beat takes with stable firebase clip ids', () => {
    const takes = listSavedBeats();
    expect(takes.map((row) => row.clip.id)).toEqual(
      expect.arrayContaining([
        FIREBASE_SEED_IDS.audio_clips.kick,
        FIREBASE_SEED_IDS.audio_clips.snare,
        FIREBASE_SEED_IDS.audio_clips.hat,
        FIREBASE_SEED_IDS.audio_clips.loop,
      ]),
    );
    expect(takes.every((row) => row.clip.purpose === 'beat')).toBe(true);
  });

  it('toggles selection on a saved beat', () => {
    seedBeats();
    const before = listSavedBeats().find((row) => row.clip.id === FIREBASE_SEED_IDS.audio_clips.hat);
    expect(before?.clip.selected).toBe(false);
    const next = toggleSavedBeat(FIREBASE_SEED_IDS.audio_clips.hat);
    expect(next.selected).toBe(true);
  });

  it('rejects short beat recordings', () => {
    expect(() =>
      saveBeatClip({
        userId: FIREBASE_SEED_IDS.users.localDev,
        durationMs: 100,
        mimeType: 'audio/webm',
        storagePath: 'local://x',
        peaks: [0.2],
      }),
    ).toThrow(AgentError);
  });

  it('stores a new Beat take', () => {
    seedBeats();
    const clip = saveBeatClip({
      userId: FIREBASE_SEED_IDS.users.localDev,
      durationMs: 1200,
      mimeType: 'audio/webm',
      storagePath: 'local://rec',
      peaks: [0.8, 0.2, 0.7, 0.3],
    });
    expect(clip.label.startsWith('Beat')).toBe(true);
    expect(clip.purpose).toBe('beat');
    expect(listSavedBeats().some((row) => row.clip.id === clip.id)).toBe(true);
  });

  it('validates and generates an instrumental beat using Kie.ai add-instrumental', async () => {
    seedBeats();
    await expect(
      generateInstrumentalBeat({
        userId: FIREBASE_SEED_IDS.users.localDev,
        sourceClipId: FIREBASE_SEED_IDS.audio_clips.kick,
        uploadUrl: '',
        title: 'Trap Beat',
        tags: 'trap, 808',
      }),
    ).rejects.toThrow(AgentError);

    const result = await generateInstrumentalBeat({
      userId: FIREBASE_SEED_IDS.users.localDev,
      sourceClipId: FIREBASE_SEED_IDS.audio_clips.kick,
      uploadUrl: 'https://example.com/vocal.mp3',
      title: 'Dark Trap Beat',
      tags: 'dark trap, heavy 808, hi hats',
      model: 'V6',
    });

    expect(result.generationId.startsWith('gen_')).toBe(true);
    expect(result.task.status).toBe('ready');
    expect(result.task.audioUrl).toBeDefined();
  });
});

