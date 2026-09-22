import { createId } from '../shared/ids';
import { readLocal, upsertLocal } from '../shared/persist';
import type { FeedbackTag, UserGenerationFeedback, UserTasteVector } from './types';

const COLLECTION_TASTE = 'user_taste_vectors';
const COLLECTION_FEEDBACK = 'user_feedbacks';

export function getDefaultTasteVector(userId: string): UserTasteVector {
  return {
    id: userId,
    userId,
    genreWeights: {
      'alternative rock': 0.7,
      'indie rock': 0.65,
      'melodic trap': 0.4,
      'contemporary R&B': 0.5,
      electronic: 0.2,
      'heavy metal': -0.5,
    },
    instrumentWeights: {
      'electric guitar': 0.5,
      'acoustic guitar': 0.5,
      'organic drums': 0.7,
      piano: 0.5,
      'harsh synth': -0.4,
      '808 bass': 0.6,
    },
    moodWeights: {
      dark: 0.7,
      emotional: 0.8,
      night: 0.75,
      chill: 0.6,
      aggressive: -0.3,
    },
    vocalPreference: {
      preferredGender: 'any',
      humanNessPreference: 0.85, // High preference for organic, human performance
    },
    negativeTagsHistory: ['screaming', 'harsh noise', 'extreme distortion'],
    totalFeedbackCount: 0,
    updatedAt: Date.now(),
  };
}

export function getUserTasteVector(userId: string): UserTasteVector {
  const existing = readLocal<UserTasteVector>(COLLECTION_TASTE, userId);
  if (existing) return existing;
  const initial = getDefaultTasteVector(userId);
  upsertLocal(COLLECTION_TASTE, initial);
  return initial;
}

export function updateUserTasteFromFeedback(
  userId: string,
  generationId: string,
  rating: 'like' | 'dislike',
  tags: FeedbackTag[] = [],
  userNotes?: string,
): UserTasteVector {
  const current = getUserTasteVector(userId);
  const updated: UserTasteVector = {
    ...current,
    genreWeights: { ...current.genreWeights },
    instrumentWeights: { ...current.instrumentWeights },
    moodWeights: { ...current.moodWeights },
    vocalPreference: { ...current.vocalPreference },
    negativeTagsHistory: [...current.negativeTagsHistory],
  };

  // 1. Record feedback entry
  const feedbackId = createId('fbk');
  const record: UserGenerationFeedback = {
    id: feedbackId,
    userId,
    generationId,
    rating,
    tags,
    userNotes,
    createdAt: Date.now(),
  };
  upsertLocal(COLLECTION_FEEDBACK, record);

  // 2. Adjust taste weights based on granular tags
  for (const tag of tags) {
    switch (tag) {
      case 'love_guitar':
        updated.instrumentWeights['electric guitar'] = Math.min(1.0, (updated.instrumentWeights['electric guitar'] || 0.5) + 0.3);
        updated.instrumentWeights['acoustic guitar'] = Math.min(1.0, (updated.instrumentWeights['acoustic guitar'] || 0.5) + 0.2);
        break;
      case 'too_electronic':
        updated.genreWeights.electronic = Math.max(-1.0, (updated.genreWeights.electronic || 0) - 0.5);
        updated.instrumentWeights['harsh synth'] = Math.max(-1.0, (updated.instrumentWeights['harsh synth'] || 0) - 0.6);
        if (!updated.negativeTagsHistory.includes('harsh EDM synth')) {
          updated.negativeTagsHistory.push('harsh EDM synth', 'aggressive electronic drops');
        }
        break;
      case 'too_aggressive':
        updated.moodWeights.aggressive = Math.max(-1.0, (updated.moodWeights.aggressive || 0) - 0.5);
        if (!updated.negativeTagsHistory.includes('heavy metal')) {
          updated.negativeTagsHistory.push('heavy metal', 'screaming');
        }
        break;
      case 'too_ai_like':
        // User wants more human imperfection, organic dynamics
        updated.vocalPreference.humanNessPreference = Math.min(1.0, updated.vocalPreference.humanNessPreference + 0.15);
        if (!updated.negativeTagsHistory.includes('overly quantized')) {
          updated.negativeTagsHistory.push('overly quantized', 'robotic autotune');
        }
        break;
      case 'perfect_mood':
        updated.moodWeights.emotional = Math.min(1.0, (updated.moodWeights.emotional || 0.5) + 0.2);
        break;
      case 'vocal_mismatch':
        // Penalize current vocal tuning
        updated.vocalPreference.humanNessPreference = 0.9;
        break;
    }
  }

  // Bounded prompt size guardrail: summarize and cap negative history to max 12 items
  updated.negativeTagsHistory = Array.from(new Set(updated.negativeTagsHistory)).slice(0, 12);
  updated.totalFeedbackCount += 1;
  updated.updatedAt = Date.now();
  upsertLocal(COLLECTION_TASTE, updated);
  return updated;
}
