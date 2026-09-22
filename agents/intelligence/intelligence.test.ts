import { describe, expect, it } from 'vitest';
import { parseMusicIntent } from './intent-parser';
import { runMusicIntelligencePipeline } from './pipeline';
import { getUserTasteVector, updateUserTasteFromFeedback } from './preference-engine';
import { compileMusicPrompt } from './prompt-compiler';
import { rerankCandidates } from './reranker';
import { analyzeVocalProfile } from './vocal-analyzer';

describe('Music Intelligence & Personalization Layer', () => {
  describe('Music Intent Parser', () => {
    it('accurately parses user text into musical parameters, scene, and negative tags', () => {
      const userText =
        'Karanlık ama çok depresif olmayan, gece araba kullanırken dinlenecek bir şarkı istiyorum. Kadın vokal olsun, gitar ağırlıklı olsun.';
      const intent = parseMusicIntent(userText);

      expect(intent.moods).toContain('dark');
      expect(intent.scene).toBe('night driving');
      expect(intent.vocal.gender).toBe('f');
      expect(intent.instrumentation).toContain('warm electric guitar');
      expect(intent.avoidTags.length).toBeGreaterThan(0);
      expect(intent.avoidTags).toContain('extreme depressing sorrow');
    });

    it('identifies energetic tempo ranges and trap instruments', () => {
      const intent = parseMusicIntent('Hızlı ve enerjik trap beat, 808 baslar');
      expect(intent.energy).toBeGreaterThan(0.7);
      expect(intent.tempoRange.minBpm).toBeGreaterThanOrEqual(125);
      expect(intent.instrumentation).toContain('punchy 808 sub-bass');
    });
  });

  describe('Vocal Profile Analyzer', () => {
    it('extracts musical key, energy, and complementary instrument recommendations', () => {
      const vocalProfile = analyzeVocalProfile({
        vocalId: 'clip_test_1',
        peaks: [0.2, 0.4, 0.6, 0.3, 0.5, 0.4],
        durationMs: 38200,
        label: 'My Vocal',
      });

      expect(vocalProfile.estimatedBpm).toBeGreaterThan(0);
      expect(vocalProfile.key).toBeDefined();
      expect(vocalProfile.vocalCharacter.length).toBeGreaterThan(0);
      expect(vocalProfile.recommendedInstruments.length).toBeGreaterThan(0);
      expect(vocalProfile.vocalPocket.lowCutHz).toBe(85);
    });
  });

  describe('User Preference Engine & Taste Vector', () => {
    it('initializes default taste vector and updates weights on granular feedback', () => {
      const userId = 'user_test_personalization';
      const initial = getUserTasteVector(userId);
      expect(initial.userId).toBe(userId);

      // User likes guitar, dislikes electronic and too AI-like
      const updated = updateUserTasteFromFeedback(
        userId,
        'gen_123',
        'dislike',
        ['too_electronic', 'love_guitar', 'too_ai_like'],
        'Daha organik olsun',
      );

      expect(updated.instrumentWeights['electric guitar']).toBeGreaterThan(initial.instrumentWeights['electric guitar']);
      expect(updated.genreWeights.electronic).toBeLessThan(initial.genreWeights.electronic);
      expect(updated.negativeTagsHistory).toContain('harsh EDM synth');
      expect(updated.negativeTagsHistory).toContain('robotic autotune');
      expect(updated.totalFeedbackCount).toBe(1);
    });
  });

  describe('Music Prompt Compiler', () => {
    it('synthesizes optimal Kie.ai prompt with acoustic and vocal pocket constraints', () => {
      const intent = parseMusicIntent('Karanlık gece rock kadın vokal');
      const vocalProfile = analyzeVocalProfile({
        vocalId: 'clip_vocal',
        peaks: [0.3, 0.5, 0.4],
        durationMs: 30000,
      });

      const compiled = compileMusicPrompt({
        intent,
        vocalProfile,
        titleSuggestion: 'Night Session',
      });

      expect(compiled.model).toBe('V6_WILD');
      expect(compiled.audioWeight).toBe(0.86); // High audio reference weight for vocal match
      expect(compiled.styleWeight).toBe(0.68);
      expect(compiled.weirdnessConstraint).toBe(0.25);
      expect(compiled.prompt).toContain('BPM');
      expect(compiled.prompt).toContain('tonal center');
      expect(compiled.prompt).toContain('carved vocal pocket');
      expect(compiled.vocalGender).toBe('f');
    });
  });

  describe('Candidate Analyzer & Technical Reranker', () => {
    it('evaluates candidate tracks using technical weighting formula and picks best track', () => {
      const intent = parseMusicIntent('Rock beat');
      const compiledPrompt = compileMusicPrompt({ intent });

      const candidateTracks = [
        { id: 'track_a', audioUrl: 'https://cdn.example.com/a.mp3', title: 'Track A', durationSec: 180 },
        { id: 'track_b', audioUrl: 'https://cdn.example.com/b.mp3', title: 'Track B', durationSec: 180 },
        { id: 'track_c', audioUrl: 'https://cdn.example.com/c.mp3', title: 'Track C', durationSec: 180 },
      ];

      const result = rerankCandidates({
        candidates: candidateTracks,
        compiledPrompt,
      });

      expect(result.ranked.length).toBe(3);
      expect(result.bestTrack).toBeDefined();
      expect(result.ranked[0].scores.finalScore).toBeGreaterThanOrEqual(result.ranked[1].scores.finalScore);
      expect(result.ranked[0].recommendationReason).toContain('Vokal Uyumu');
    });
  });

  describe('Full Music Intelligence Pipeline', () => {
    it('orchestrates the entire flow seamlessly from user text and vocal clip', () => {
      const result = runMusicIntelligencePipeline(
        {
          userId: 'user_pipeline_test',
          userPrompt: 'Karanlık araba sürüşü için kadın vokal alternatif rock',
          vocalClip: {
            id: 'clip_1',
            peaks: [0.3, 0.5, 0.6],
            durationMs: 25000,
            label: 'Take 1',
          },
        },
        [
          { id: 'cand_1', audioUrl: 'mock://1', title: 'Candidate 1', durationSec: 120 },
          { id: 'cand_2', audioUrl: 'mock://2', title: 'Candidate 2', durationSec: 120 },
        ],
      );

      expect(result.metadata.intelligenceEnabled).toBe(true);
      expect(result.compiledPrompt.model).toBe('V6_WILD');
      expect(result.vocalProfile).toBeDefined();
      expect(result.bestTrack).toBeDefined();
    });
  });
});
