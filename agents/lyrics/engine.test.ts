import { describe, expect, it, vi } from 'vitest';
import {
  cuesAt,
  fallbackTrack,
  formatLrcTime,
  parseCues,
  resolveLyricTrack,
  scaleLrc,
  titleFromFileName,
  FALLBACK_LRC_SPAN_SEC,
  FALLBACK_TR_LRC,
} from './engine';

const SAMPLE = `[ti:Deneme]
[00:00.00] Bir
[00:02.00] İki
[00:04.00] Üç`;

describe('lyric engine', () => {
  it('parses LRC through liricle and follows playhead', () => {
    const cues = parseCues(SAMPLE);
    expect(cues.map((c) => c.text)).toEqual(['Bir', 'İki', 'Üç']);
    expect(cuesAt(cues, 0.2, 6).current).toBe('Bir');
    expect(cuesAt(cues, 2.1, 6).current).toBe('İki');
    expect(cuesAt(cues, 2.1, 6).next).toBe('Üç');
    expect(cuesAt(cues, 3, 6).progress).toBeGreaterThan(0.4);
  });

  it('scales timestamps to the uploaded song duration', () => {
    const scaled = scaleLrc(SAMPLE, 4, 8);
    const cues = parseCues(scaled);
    expect(cues[1]?.time).toBeCloseTo(4, 1);
    expect(formatLrcTime(65.5)).toBe('01:05.50');
  });

  it('builds Turkish fallback lyrics at the track tempo', () => {
    const track = fallbackTrack('Gece', 72);
    expect(track.source).toBe('fallback');
    expect(track.language).toBe('tr');
    expect(track.cues.length).toBeGreaterThan(6);
    expect(track.cues.at(-1)?.time).toBeGreaterThan(60);
    expect(FALLBACK_TR_LRC).toContain('Ritmin');
    expect(FALLBACK_LRC_SPAN_SEC).toBeGreaterThan(10);
  });

  it('uses lrclib synced lyrics when the free API returns a hit', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          trackName: 'Gece',
          artistName: 'Vibe',
          duration: 8,
          syncedLyrics: '[00:00.00] Merhaba\n[00:04.00] Dünya',
        },
      ],
    })) as unknown as typeof fetch;
    const track = await resolveLyricTrack('Gece', 8, fetchImpl);
    expect(track.source).toBe('lrclib');
    expect(track.cues[0]?.text).toBe('Merhaba');
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('falls back to Turkish karaoke when lrclib misses', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [],
    })) as unknown as typeof fetch;
    const track = await resolveLyricTrack('bilinmeyen-parca', 20, fetchImpl);
    expect(track.source).toBe('fallback');
    expect(track.cues[0]?.text).toMatch(/Gece|Ritmin|Bu ses/);
    expect(titleFromFileName('gece_yolu.mp3')).toBe('gece yolu');
  });
});
