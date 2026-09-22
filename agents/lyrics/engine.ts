import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { detectLanguage } from '../create/lyrics';
import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';
import { upsertLocal } from '../shared/persist';
import Liricle from '../../vendor/liricle/dist/esm/liricle.mjs';

const log = createLogger('lyric-engine');

export type LyricCue = {
  time: number;
  text: string;
};

export type LyricSource = 'lrclib' | 'lrc-file' | 'fallback';

export type LyricTrack = {
  title: string;
  artist: string;
  durationSec: number;
  lrc: string;
  cues: LyricCue[];
  source: LyricSource;
  language: 'tr' | 'en' | 'mixed';
};

export type LyricFrame = {
  index: number;
  prev: string;
  current: string;
  next: string;
  progress: number;
};

/** Timed Turkish bed — scaled to the uploaded track so the karaoke keeps the song's tempo. */
export const FALLBACK_TR_LRC = `[ti:Vibe]
[ar:Vibe]
[00:00.00] Gece ışıklarını yak
[00:03.40] Ritmin göğsümde dur
[00:06.80] Bu ses bize ait
[00:10.20] Kalp atışıyla yüksel
[00:13.60] Şehir uyanıyor yavaş
[00:17.00] Sözün içimde yankı
[00:20.40] Adımın temposu bu
[00:23.80] Vibe ile dön geceye
[00:27.20] Nefes al, bırak aksın
[00:30.60] Paylaş, parlasın bu an
[00:34.00] Son nota da seninle`;

export const FALLBACK_LRC_SPAN_SEC = 36;

type LrclibHit = {
  trackName?: string;
  artistName?: string;
  duration?: number;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
};

export function formatLrcTime(sec: number): string {
  const clamped = Math.max(0, sec);
  const m = Math.floor(clamped / 60);
  const s = clamped - m * 60;
  const whole = Math.floor(s);
  const cs = Math.round((s - whole) * 100);
  return `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function parseCues(lrc: string): LyricCue[] {
  const runner = new Liricle();
  runner.load({ text: lrc, skipBlankLine: true });
  return (runner.data?.lines ?? []).map((line) => ({
    time: line.time,
    text: line.text.trim(),
  }));
}

export function scaleLrc(lrc: string, fromSec: number, toSec: number): string {
  const span = Math.max(0.5, fromSec);
  const target = Math.max(0.5, toSec);
  const ratio = target / span;
  return lrc.replace(/\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g, (full, mm: string, ss: string) => {
    if (full.startsWith('[ti') || Number.isNaN(Number(mm))) return full;
    const t = Number(mm) * 60 + Number(ss);
    if (!Number.isFinite(t)) return full;
    return `[${formatLrcTime(t * ratio)}]`;
  });
}

export function cuesAt(cues: LyricCue[], timeSec: number, durationSec: number): LyricFrame {
  if (cues.length === 0) {
    return { index: -1, prev: '', current: '', next: '', progress: 0 };
  }
  let index = 0;
  while (index + 1 < cues.length && cues[index + 1].time <= timeSec) index += 1;
  if (timeSec < cues[0].time) {
    return { index: -1, prev: '', current: '', next: cues[0].text, progress: 0 };
  }
  const current = cues[index];
  const nextCue = cues[index + 1];
  const end = nextCue?.time ?? Math.max(current.time + 0.8, durationSec);
  const span = Math.max(0.05, end - current.time);
  return {
    index,
    prev: cues[index - 1]?.text ?? '',
    current: current.text,
    next: nextCue?.text ?? '',
    progress: Math.min(1, Math.max(0, (timeSec - current.time) / span)),
  };
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Vibe';
}

export async function lookupLrclib(
  query: string,
  durationSec: number,
  fetchImpl: typeof fetch = fetch,
): Promise<LrclibHit | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const rows = (await res.json()) as LrclibHit[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const timed = rows.filter((row) => (row.syncedLyrics ?? '').includes('['));
    const pool = timed.length > 0 ? timed : rows;
    const scored = pool
      .map((row) => ({
        row,
        gap: Math.abs((row.duration ?? durationSec) - durationSec),
      }))
      .sort((a, b) => a.gap - b.gap);
    return scored[0]?.row ?? null;
  } catch (error) {
    log.warn('lyric.lrclib-fail', { message: String(error) });
    return null;
  }
}

export function fallbackTrack(title: string, durationSec: number): LyricTrack {
  const lrc = scaleLrc(FALLBACK_TR_LRC, FALLBACK_LRC_SPAN_SEC, durationSec);
  return {
    title,
    artist: 'Vibe',
    durationSec,
    lrc,
    cues: parseCues(lrc),
    source: 'fallback',
    language: 'tr',
  };
}

export async function resolveLyricTrack(
  title: string,
  durationSec: number,
  fetchImpl: typeof fetch = fetch,
): Promise<LyricTrack> {
  const hit = await lookupLrclib(title, durationSec, fetchImpl);
  const synced = hit?.syncedLyrics?.trim();
  if (hit && synced) {
    const lrc = scaleLrc(synced, hit.duration || durationSec, durationSec);
    const cues = parseCues(lrc);
    const body = cues.map((c) => c.text).join('\n');
    const track: LyricTrack = {
      title: hit.trackName || title,
      artist: hit.artistName || 'Vibe',
      durationSec,
      lrc,
      cues,
      source: 'lrclib',
      language: detectLanguage(body || synced),
    };
    log.info('lyric.resolved', { source: track.source, lines: cues.length, language: track.language });
    return track;
  }
  const track = fallbackTrack(title, durationSec);
  log.info('lyric.resolved', { source: track.source, lines: track.cues.length, language: 'tr' });
  return track;
}

export function persistLyricTrack(userId: string, track: LyricTrack, fileName: string): string {
  const id = createId('cue');
  upsertLocal(FIREBASE_COLLECTIONS.lyric_cues.name, {
    id,
    userId,
    title: track.title,
    artist: track.artist,
    fileName,
    durationMs: Math.round(track.durationSec * 1000),
    lrc: track.lrc,
    source: track.source,
    language: track.language,
    createdAt: Date.now(),
  });
  return id;
}

export type AlignedLyricsLine = {
  lineIndex: number;
  startS: number;
  endS: number;
  text: string;
  words: Array<{ word: string; startS: number; endS: number; success?: boolean }>;
};

export function groupAlignedWordsIntoLines(
  words: Array<{ word: string; startS: number; endS: number; success?: boolean }>,
): AlignedLyricsLine[] {
  if (!words || words.length === 0) return [];
  const lines: AlignedLyricsLine[] = [];
  let currentWords: Array<{ word: string; startS: number; endS: number; success?: boolean }> = [];

  const flushLine = () => {
    if (currentWords.length === 0) return;
    const startS = currentWords[0].startS;
    const endS = currentWords[currentWords.length - 1].endS;
    const text = currentWords.map((w) => w.word.replace(/\[.*?\]/g, '').trim()).filter(Boolean).join(' ');
    lines.push({
      lineIndex: lines.length,
      startS,
      endS,
      text,
      words: [...currentWords],
    });
    currentWords = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    const prev = words[i - 1];
    const hasNewline = w.word.includes('\n');
    const timeGap = prev ? w.startS - prev.endS : 0;

    if (currentWords.length > 0 && (hasNewline || timeGap > 1.2 || currentWords.length >= 8)) {
      flushLine();
    }
    currentWords.push({
      ...w,
      word: w.word.replace(/\n/g, ' ').trim(),
    });
  }
  flushLine();
  return lines;
}

export function findActiveWordAndLine(
  lines: AlignedLyricsLine[],
  timeSec: number,
): {
  activeLineIndex: number;
  activeWordIndex: number;
  activeWordText: string;
} {
  if (!lines || lines.length === 0) {
    return { activeLineIndex: -1, activeWordIndex: -1, activeWordText: '' };
  }

  let lineIdx = 0;
  while (lineIdx + 1 < lines.length && lines[lineIdx + 1].startS <= timeSec) {
    lineIdx += 1;
  }

  const currentLine = lines[lineIdx];
  if (!currentLine) {
    return { activeLineIndex: -1, activeWordIndex: -1, activeWordText: '' };
  }

  let activeWordIndex = -1;
  let activeWordText = '';

  for (let wIdx = 0; wIdx < currentLine.words.length; wIdx += 1) {
    const w = currentLine.words[wIdx];
    if (timeSec >= w.startS && timeSec <= w.endS + 0.15) {
      activeWordIndex = wIdx;
      activeWordText = w.word;
      break;
    }
  }

  return {
    activeLineIndex: lineIdx,
    activeWordIndex,
    activeWordText,
  };
}
