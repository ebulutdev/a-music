import { describe, expect, it } from 'vitest';
import {
  applyCustomVocalModifiers,
  generateHarmonicBeatPrompt,
  HUMANIZER_PRESETS,
  normalizeTurkishSpeechText,
  numberToTurkishWords,
  planSpeechPerformance,
  planVocalArrangement,
  registerCustomVocalModifier,
} from './humanizer';

describe('Vocal Humanizer Engine', () => {
  describe('Turkish Text Normalization', () => {
    it('normalizes numbers to Turkish spoken words', () => {
      expect(numberToTurkishWords(0)).toBe('sıfır');
      expect(numberToTurkishWords(5)).toBe('beş');
      expect(numberToTurkishWords(42)).toBe('kırk iki');
      expect(numberToTurkishWords(100)).toBe('yüz');
      expect(numberToTurkishWords(2026)).toBe('iki bin yirmi altı');
    });

    it('normalizes percentages and currencies in text', () => {
      const input = 'BIST %2,35 arttı ve 100 TL kazanç sağlandı';
      const norm = normalizeTurkishSpeechText(input);
      expect(norm).toContain('yüzde iki virgül otuz beş');
      expect(norm).toContain('yüz Türk lirası');
      expect(norm).toContain('bist');
    });
  });

  describe('Speech Performance Planning', () => {
    it('plans breaths and pauses for natural prosody', () => {
      const plan = planSpeechPerformance('Gece yine seni düşündüm, rüzgar esiyor ve yıldızlar parlıyor.');
      expect(plan.pausePoints.length).toBeGreaterThan(0);
      expect(plan.prosody.pitchVarianceCents).toBeGreaterThan(0);
      expect(plan.estimatedDurationSec).toBeGreaterThan(1);
    });
  });

  describe('Vocal Arrangement & Layering', () => {
    it('generates stereo double vocals with accurate delays and pans', () => {
      const plan = planVocalArrangement('Sözler burada', {
        preset: 'vocal-doubles',
        doublerEnabled: true,
        harmoniesEnabled: true,
      });

      expect(plan.layers.length).toBeGreaterThanOrEqual(3);
      const lead = plan.layers.find((l) => l.role === 'lead');
      const doubleL = plan.layers.find((l) => l.role === 'double_l');
      const doubleR = plan.layers.find((l) => l.role === 'double_r');

      expect(lead).toBeDefined();
      expect(lead?.pan).toBe(0);

      expect(doubleL).toBeDefined();
      expect(doubleL?.pan).toBeLessThan(0); // Panned left
      expect(doubleL?.delayMs).toBe(18);

      expect(doubleR).toBeDefined();
      expect(doubleR?.pan).toBeGreaterThan(0); // Panned right
      expect(doubleR?.delayMs).toBe(-12);
    });
  });

  describe('Harmonic Beat Prompt Generator', () => {
    it('enriches prompt with musical key, BPM, and vocal pocket instruction', () => {
      const result = generateHarmonicBeatPrompt({
        userPrompt: '808 trap beat',
        vocalGender: 'm',
      });

      expect(result.tags).toContain('vocal pocket');
      expect(result.tags).toContain('808');
      expect(result.prompt).toContain('808 trap beat');
    });
  });

  describe('Custom Modifier Registry', () => {
    it('allows registering and applying custom vocal modifiers', () => {
      registerCustomVocalModifier('test-boost', ({ plan }) => {
        return {
          ...plan,
          masterGain: 1.25,
        };
      });

      const basePlan = planVocalArrangement('Test', HUMANIZER_PRESETS['human-natural']);
      const modified = applyCustomVocalModifiers(basePlan, HUMANIZER_PRESETS['human-natural']);
      expect(modified.masterGain).toBe(1.25);
    });
  });
});
