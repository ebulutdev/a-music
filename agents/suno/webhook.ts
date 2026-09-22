import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { AgentError } from '../shared/errors';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { readAllLocal, upsertLocal } from '../shared/persist';
import type { GenerationRecord } from '../create/agent';

const log = createLogger('suno-webhook');

export type KieWebhookStatus =
  | 'QUEUED'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'FAILED';

const STATE_HIERARCHY: Record<KieWebhookStatus, number> = {
  QUEUED: 0,
  SUBMITTED: 1,
  PROCESSING: 2,
  PARTIAL: 3,
  COMPLETED: 4,
  FAILED: 4,
};

export type KieWebhookPayload = {
  taskId: string;
  status: KieWebhookStatus | string;
  response?: {
    sunoData?: Array<{
      id?: string;
      audioUrl?: string;
      audio_url?: string;
      title?: string;
      duration?: number;
    }>;
  };
  error?: string;
  callbackToken?: string;
};

// In-memory replay cache to protect against replay attacks within a window
const processedCallbacks = new Set<string>();

export function resetWebhookReplayCache(): void {
  processedCallbacks.clear();
}

/**
 * Handles incoming Kie.ai webhook callbacks with idempotency, signature validation,
 * state machine checking, and replay protection.
 */
export function handleKieWebhook(payload: KieWebhookPayload, expectedToken?: string): {
  success: boolean;
  duplicate: boolean;
  generationId: string;
  currentStatus: string;
} {
  if (!payload || typeof payload !== 'object') {
    throw new AgentError('WEBHOOK_MALFORMED', 'Geçersiz webhook verisi: JSON nesnesi bekleniyor.');
  }

  const taskId = payload.taskId;
  if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
    throw new AgentError('WEBHOOK_MISSING_TASK_ID', "Webhook çağrısında 'taskId' alanı zorunludur.");
  }

  // Token validation if secret authentication is configured
  if (expectedToken) {
    if (payload.callbackToken !== expectedToken) {
      throw new AgentError('WEBHOOK_UNAUTHORIZED', 'Geçersiz webhook güvenlik imzası veya token.');
    }
  }

  const rawStatus = (payload.status || '').toUpperCase() as KieWebhookStatus;
  if (!STATE_HIERARCHY[rawStatus] && rawStatus !== 'QUEUED') {
    throw new AgentError('WEBHOOK_INVALID_STATUS', `Bilinmeyen webhook durum kodu: '${payload.status}'.`);
  }

  // Find associated generation record
  const generations = readAllLocal<GenerationRecord>(FIREBASE_COLLECTIONS.generations.name);
  const generation = generations.find((g) => g.providerTaskId === taskId);

  if (!generation) {
    log.warn('webhook.unknown_task', { taskId });
    throw new AgentError(
      'WEBHOOK_UNKNOWN_TASK',
      `TaskId '${taskId}' ile eşleşen bir müzik üretim kaydı bulunamadı.`,
    );
  }

  // Check replay idempotency key: taskId + status + (audioUrl || '')
  const sunoItem = payload.response?.sunoData?.[0];
  const audioUrl = sunoItem?.audioUrl || sunoItem?.audio_url;
  const idempotencyKey = `${taskId}:${rawStatus}:${audioUrl || ''}`;

  if (processedCallbacks.has(idempotencyKey)) {
    log.info('webhook.duplicate_ignored', { taskId, rawStatus });
    return {
      success: true,
      duplicate: true,
      generationId: generation.id,
      currentStatus: generation.status,
    };
  }

  // State machine transition validation
  const currentGenStatus = (generation.status === 'ready'
    ? 'COMPLETED'
    : generation.status === 'failed'
      ? 'FAILED'
      : generation.status === 'running'
        ? 'PROCESSING'
        : 'QUEUED') as KieWebhookStatus;

  const currentLevel = STATE_HIERARCHY[currentGenStatus] ?? 0;
  const incomingLevel = STATE_HIERARCHY[rawStatus] ?? 0;

  // Reject illegal backwards state transition (e.g. COMPLETED -> PROCESSING)
  if (currentLevel >= 4 && incomingLevel < 4) {
    log.warn('webhook.illegal_transition', {
      generationId: generation.id,
      currentGenStatus,
      rawStatus,
    });
    return {
      success: true,
      duplicate: true,
      generationId: generation.id,
      currentStatus: generation.status,
    };
  }

  // Update generation state
  if (rawStatus === 'COMPLETED') {
    generation.status = 'ready';
    generation.finishedAt = Date.now();

    if (audioUrl) {
      // Create or update song entry once
      const songs = readAllLocal<{ id: string; generationId?: string }>(FIREBASE_COLLECTIONS.songs.name);
      const existingSong = songs.find((s) => s.generationId === generation.id);

      if (!existingSong) {
        const songId = createId('song');
        upsertLocal(FIREBASE_COLLECTIONS.songs.name, {
          id: songId,
          userId: generation.userId,
          generationId: generation.id,
          title: sunoItem?.title || generation.title || 'Generated Track',
          artist: 'AI Music Studio',
          coverTone: 'create',
          audioUrl,
          durationMs: sunoItem?.duration ? sunoItem.duration * 1000 : 180000,
          kind: generation.kind,
          createdAt: Date.now(),
        });
      }
    }
  } else if (rawStatus === 'FAILED') {
    generation.status = 'failed';
    generation.error = payload.error || 'Provider generation failed';
    generation.finishedAt = Date.now();
  } else {
    generation.status = 'running';
  }

  upsertLocal(FIREBASE_COLLECTIONS.generations.name, generation);
  processedCallbacks.add(idempotencyKey);

  log.info('webhook.processed', {
    generationId: generation.id,
    newStatus: generation.status,
    rawStatus,
  });

  return {
    success: true,
    duplicate: false,
    generationId: generation.id,
    currentStatus: generation.status,
  };
}
