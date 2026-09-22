import { describe, expect, it } from 'vitest';
import { analyzeVocalProfile } from '../agents/intelligence/vocal-analyzer';
import { normalizeWaveform } from '../agents/vocal/agent';

describe('Vocal Pipeline & Failure Detection Tests', () => {
  it('detects BPM, key, energy, and character on clean vocal', () => {
    const cleanPeaks = [0.2, 0.4, 0.6, 0.8, 0.7, 0.5, 0.3, 0.4];
    const profile = analyzeVocalProfile({
      vocalId: 'clean_vocal_1',
      peaks: cleanPeaks,
      durationMs: 8500,
      label: 'Clean Female Lead',
    });

    expect(profile.estimatedBpm).toBeGreaterThan(60);
    expect(profile.estimatedBpm).toBeLessThan(180);
    expect(profile.key).not.toBe('unknown');
    expect(profile.energy).toBeGreaterThan(0.2);
    expect(profile.vocalCharacter.length).toBeGreaterThan(0);
    expect(profile.vocalPocket.lowCutHz).toBe(85);
  });

  it('returns null BPM and unknown key for silent audio without fabricating', () => {
    const silentPeaks = [0.0, 0.0, 0.0, 0.0, 0.001, 0.0];
    const profile = analyzeVocalProfile({
      vocalId: 'silent_file',
      peaks: silentPeaks,
      durationMs: 4000,
    });

    // Must NOT fabricate BPM or musical key
    expect(profile.estimatedBpm).toBeNull();
    expect(profile.key).toBe('unknown');
    expect(profile.energy).toBe(0);
    expect(profile.vocalCharacter).toEqual(['silent']);
    expect(profile.recommendedInstruments).toEqual([]);
  });

  it('returns null BPM and unknown key for corrupt or ultra-short audio (<400ms)', () => {
    const profile = analyzeVocalProfile({
      vocalId: 'corrupted_short',
      peaks: [0.5, 0.9],
      durationMs: 150, // Ultra short, impossible to detect musical tempo
    });

    expect(profile.estimatedBpm).toBeNull();
    expect(profile.key).toBe('unknown');
  });

  it('normalizes waveform bars into bounded 0-1 peak representations', () => {
    const rawPeaks = [0.05, 0.95, -0.4, 1.5, 0.0];
    const normalized = normalizeWaveform(rawPeaks, 48);

    expect(normalized.length).toBe(48);
    for (const val of normalized) {
      const num = parseFloat(val);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(1);
    }
  });
});
