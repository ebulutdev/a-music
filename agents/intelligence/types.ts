/**
 * ============================================================================
 * MUSIC INTELLIGENCE & PERSONALIZATION LAYER - TYPE DEFINITIONS
 * ============================================================================
 * Bu katman, kullanıcının ham metin isteğini ve vokal kaydını analiz ederek
 * Kie.ai için en yüksek uyum ve kalitede müzik parametreleri derleyen
 * modüler zeka katmanıdır.
 *
 * İstenmediğinde kolayca devre dışı bırakılabilir veya kaldırılabilir.
 * ============================================================================
 */

export type ParsedMusicIntent = {
  rawPrompt: string;
  moods: string[];
  energy: number; // 0.0 - 1.0
  genres: string[];
  vocal: {
    gender?: 'm' | 'f';
    style?: 'intimate' | 'aggressive' | 'melodic' | 'breathy' | 'raw';
    energy?: number;
  };
  instrumentation: string[];
  tempoRange: { minBpm: number; maxBpm: number };
  scene?: string; // örn: "night driving", "workout", "chill study"
  avoidTags: string[]; // negative_tags için elenecek öğeler
};

export type VocalProfileAnalysis = {
  vocalId?: string;
  estimatedBpm: number | null;
  key: string; // örn: "F# minor", "A minor", "C major", "unknown"
  pitchRange: { low: string; high: string };
  averagePitch: string;
  pitchVariance: number;
  energy: number;
  vocalCharacter: string[]; // örn: ["warm", "intimate", "breathy", "close_mic"]
  rhythmStyle: 'syncopated' | 'straight' | 'fluid';
  recommendedInstruments: string[];
  vocalPocket: { lowCutHz: number; presencePeakHz: number };
};

export type UserTasteVector = {
  id: string;
  userId: string;
  genreWeights: Record<string, number>;
  instrumentWeights: Record<string, number>; // örn: { guitar: 0.85, piano: 0.5, synth: -0.3 }
  moodWeights: Record<string, number>; // örn: { dark: 0.75, happy: 0.2, romantic: 0.6 }
  vocalPreference: {
    preferredGender: 'm' | 'f' | 'any';
    humanNessPreference: number; // 0 = synthetic/autotune, 1 = 100% natural organic
  };
  negativeTagsHistory: string[];
  totalFeedbackCount: number;
  updatedAt: number;
};

export type FeedbackTag =
  | 'vocal_mismatch'
  | 'beat_too_busy'
  | 'too_electronic'
  | 'too_aggressive'
  | 'too_ai_like'
  | 'love_guitar'
  | 'love_drums'
  | 'perfect_mood'
  | 'wrong_tempo';

export type UserGenerationFeedback = {
  id: string;
  userId: string;
  generationId: string;
  rating: 'like' | 'dislike';
  tags?: FeedbackTag[];
  userNotes?: string;
  createdAt: number;
};

export type CompiledMusicPrompt = {
  prompt: string;
  style: string;
  title: string;
  negativeTags: string;
  vocalGender?: 'm' | 'f';
  // Kie.ai Advanced Weights
  styleWeight: number; // 0.0 - 1.0 (örn: 0.72)
  weirdnessConstraint: number; // 0.0 - 1.0 (örn: 0.28)
  audioWeight: number; // 0.0 - 1.0 (örn: 0.86)
  model: 'V6_WILD' | 'V6' | 'V6_MINI';
  customMode: boolean;
  metadata: {
    compiledTempo: number;
    compiledKey: string;
    targetMood: string;
    intelligenceApplied: boolean;
  };
};

export type CandidateTrack = {
  id: string;
  audioUrl: string;
  title: string;
  durationSec: number;
  metadata?: Record<string, unknown>;
};

export type CandidateEvaluation = {
  track: CandidateTrack;
  scores: {
    vocalMatch: number; // 0 - 1 (Ağırlık: %30)
    styleMatch: number; // 0 - 1 (Ağırlık: %25)
    userPreference: number; // 0 - 1 (Ağırlık: %25)
    moodMatch: number; // 0 - 1 (Ağırlık: %10)
    tempoMatch: number; // 0 - 1 (Ağırlık: %10)
    finalScore: number; // 0 - 1
  };
  recommendationReason: string;
};
