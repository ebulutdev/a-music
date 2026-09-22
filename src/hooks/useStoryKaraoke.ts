import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cuesAt,
  persistLyricTrack,
  resolveLyricTrack,
  titleFromFileName,
  type LyricFrame,
  type LyricTrack,
} from '@agents';
import { createLogger } from '@agents';

const log = createLogger('story-karaoke');
const BARS = 44;

function idleLevels(now: number): number[] {
  return Array.from({ length: BARS }, (_, i) => {
    const wave = 0.22 + Math.sin(now / 280 + i * 0.38) * 0.1 + Math.sin(now / 520 + i * 0.17) * 0.08;
    return Math.min(0.55, Math.max(0.08, wave));
  });
}

function readLevels(analyser: AnalyserNode): number[] {
  const buffer = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buffer as Uint8Array<ArrayBuffer>);
  const slice = Math.max(1, Math.floor(buffer.length / BARS));
  return Array.from({ length: BARS }, (_, i) => {
    let sum = 0;
    for (let k = 0; k < slice; k += 1) sum += buffer[i * slice + k] ?? 0;
    const avg = sum / slice / 255;
    const bassBoost = i < 8 ? 1.18 : i > 32 ? 0.82 : 1;
    return Math.min(1, avg * bassBoost * 1.35);
  });
}

export function useStoryKaraoke(userId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const urlRef = useRef<string | null>(null);
  const trackRef = useRef<LyricTrack | null>(null);
  const rafRef = useRef(0);

  const [track, setTrack] = useState<LyricTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => idleLevels(0));
  const [frame, setFrame] = useState<LyricFrame>({
    index: -1,
    prev: '',
    current: '',
    next: '',
    progress: 0,
  });

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  const tick = useCallback(() => {
    const audio = audioRef.current;
    const cues = trackRef.current?.cues ?? [];
    const duration = audio?.duration || trackRef.current?.durationSec || 1;
    const time = audio?.currentTime ?? 0;
    setCurrentSec(time);
    setDurationSec(duration);
    setFrame(cuesAt(cues, time, duration));

    const analyser = analyserRef.current;
    if (analyser && audio && !audio.paused) {
      setLevels(readLevels(analyser));
    } else {
      setLevels(idleLevels(performance.now()));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => stopRaf();
  }, [tick]);

  useEffect(() => {
    return () => {
      stopRaf();
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  const ensureGraph = async (audio: HTMLAudioElement) => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.58;
      analyserRef.current = analyser;
    }
    if (!sourceRef.current) {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
      sourceRef.current = source;
    }
  };

  const loadFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i)) {
      log.warn('lyric.file-skip', { type: file.type, name: file.name });
      return;
    }
    setBusy(true);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.preload = 'auto';
    audio.src = url;

    await new Promise<void>((resolve) => {
      const done = () => {
        audio.removeEventListener('loadedmetadata', done);
        resolve();
      };
      audio.addEventListener('loadedmetadata', done);
      if (Number.isFinite(audio.duration) && audio.duration > 0) done();
      window.setTimeout(done, 1200);
    });

    const durationSec = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 32;
    const title = titleFromFileName(file.name);
    const next = await resolveLyricTrack(title, durationSec);
    trackRef.current = next;
    setTrack(next);
    persistLyricTrack(userId, next, file.name);
    try {
      await ensureGraph(audio);
      await audio.play();
      setPlaying(true);
    } catch (error) {
      setPlaying(false);
      log.warn('lyric.play-block', { message: String(error) });
    }
    setBusy(false);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) return;
    if (audio.paused) {
      try {
        await ensureGraph(audio);
        await audio.play();
        setPlaying(true);
      } catch (error) {
        log.warn('lyric.play-block', { message: String(error) });
      }
      return;
    }
    audio.pause();
    setPlaying(false);
  };

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  return { track, playing, busy, levels, frame, currentSec, durationSec, loadFile, toggle, pause };
}
