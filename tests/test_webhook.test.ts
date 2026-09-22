import { beforeEach, describe, expect, it } from 'vitest';
import { FIREBASE_COLLECTIONS } from '../database/firebase-collections';
import { readAllLocal, resetAllLocal, upsertLocal } from '../agents/shared/persist';
import { handleKieWebhook, resetWebhookReplayCache } from '../agents/suno/webhook';
import type { GenerationRecord } from '../agents/create/agent';

describe('Webhook & Callback Engine Tests', () => {
  const mockTaskId = 'suno_task_test_999';
  const mockGenId = 'gen_test_webhook';
  const testUser = 'user_qa_tester';

  beforeEach(() => {
    resetAllLocal();
    resetWebhookReplayCache();

    // Seed an initial running generation associated with mockTaskId
    const genRecord: GenerationRecord = {
      id: mockGenId,
      userId: testUser,
      kind: 'create',
      status: 'running',
      model: 'V6_WILD',
      prompt: 'Night city atmospheric synth',
      title: 'Night City',
      customMode: false,
      instrumental: true,
      provider: 'suno',
      providerTaskId: mockTaskId,
      sourceClipIds: [],
      voiceProfileIds: [],
      startedAt: Date.now(),
    };
    upsertLocal(FIREBASE_COLLECTIONS.generations.name, genRecord);
  });

  it('rejects malformed callback or missing task ID', () => {
    // Missing taskId
    expect(() =>
      handleKieWebhook({ taskId: '', status: 'PROCESSING' }),
    ).toThrow(/taskId' alanı zorunludur/i);

    // Invalid status
    expect(() =>
      handleKieWebhook({ taskId: mockTaskId, status: 'UNKNOWN_JUNK' }),
    ).toThrow(/Bilinmeyen webhook durum kodu/i);
  });

  it('rejects unknown task ID not present in generations', () => {
    expect(() =>
      handleKieWebhook({ taskId: 'suno_non_existent_id', status: 'COMPLETED' }),
    ).toThrow(/eşleşen bir müzik üretim kaydı bulunamadı/i);
  });

  it('verifies callback authentication token if required', () => {
    expect(() =>
      handleKieWebhook(
        { taskId: mockTaskId, status: 'PROCESSING', callbackToken: 'wrong_secret' },
        'correct_secret',
      ),
    ).toThrow(/Geçersiz webhook güvenlik imzası/i);

    const res = handleKieWebhook(
      { taskId: mockTaskId, status: 'PROCESSING', callbackToken: 'correct_secret' },
      'correct_secret',
    );
    expect(res.success).toBe(true);
  });

  it('handles state transitions cleanly: PROCESSING -> COMPLETED', () => {
    // 1. Process intermediate PROCESSING callback
    const procRes = handleKieWebhook({
      taskId: mockTaskId,
      status: 'PROCESSING',
    });
    expect(procRes.success).toBe(true);
    expect(procRes.duplicate).toBe(false);

    const genAfterProc = readAllLocal<GenerationRecord>(FIREBASE_COLLECTIONS.generations.name).find(
      (g) => g.id === mockGenId,
    );
    expect(genAfterProc?.status).toBe('running');

    // 2. Process final COMPLETED callback with generated audio
    const compRes = handleKieWebhook({
      taskId: mockTaskId,
      status: 'COMPLETED',
      response: {
        sunoData: [
          {
            id: 'audio_123',
            audioUrl: 'https://cdn.kie.ai/music/night_city.mp3',
            title: 'Night City - Master',
            duration: 184,
          },
        ],
      },
    });
    expect(compRes.success).toBe(true);
    expect(compRes.duplicate).toBe(false);

    // Verify generation status is ready
    const genAfterComp = readAllLocal<GenerationRecord>(FIREBASE_COLLECTIONS.generations.name).find(
      (g) => g.id === mockGenId,
    );
    expect(genAfterComp?.status).toBe('ready');

    // Verify exactly ONE song record was created
    const songs = readAllLocal<{ id: string; audioUrl: string }>(FIREBASE_COLLECTIONS.songs.name);
    expect(songs.length).toBe(1);
    expect(songs[0].audioUrl).toBe('https://cdn.kie.ai/music/night_city.mp3');
  });

  it('idempotency: sending identical completion callback multiple times produces exactly ONE song record', () => {
    const payload = {
      taskId: mockTaskId,
      status: 'COMPLETED',
      response: {
        sunoData: [
          {
            audioUrl: 'https://cdn.kie.ai/music/duplicate_test.mp3',
            title: 'Duplicate Test Track',
            duration: 120,
          },
        ],
      },
    };

    // First delivery
    const res1 = handleKieWebhook(payload);
    expect(res1.duplicate).toBe(false);

    // Second delivery (e.g. network retry from provider)
    const res2 = handleKieWebhook(payload);
    expect(res2.duplicate).toBe(true);

    // Third delivery
    const res3 = handleKieWebhook(payload);
    expect(res3.duplicate).toBe(true);

    // Exactly ONE song record in database, no duplicates
    const songs = readAllLocal(FIREBASE_COLLECTIONS.songs.name);
    expect(songs.length).toBe(1);

    // Exactly ONE generation record
    const gens = readAllLocal(FIREBASE_COLLECTIONS.generations.name);
    expect(gens.length).toBe(1);
  });

  it('rejects illegal backwards state transitions (e.g. COMPLETED -> PROCESSING)', () => {
    // Set to COMPLETED
    handleKieWebhook({
      taskId: mockTaskId,
      status: 'COMPLETED',
      response: { sunoData: [{ audioUrl: 'https://cdn.kie.ai/track.mp3' }] },
    });

    // An out-of-order delayed PROCESSING callback arrives
    const backwardRes = handleKieWebhook({
      taskId: mockTaskId,
      status: 'PROCESSING',
    });

    // Ignored gracefully as duplicate/no-op, state remains ready
    expect(backwardRes.duplicate).toBe(true);
    const gen = readAllLocal<GenerationRecord>(FIREBASE_COLLECTIONS.generations.name).find(
      (g) => g.id === mockGenId,
    );
    expect(gen?.status).toBe('ready');
  });
});
