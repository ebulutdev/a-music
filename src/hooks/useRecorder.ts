import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger, processStepAt, type ProcessStep } from '@agents';

const log = createLogger('recorder');
const VOCAL_BARS = 80;
const BEAT_BARS = 48;

export type RecorderKind = 'vocal' | 'beat';

function envelope(i: number, bars: number): number {
  return Math.pow(Math.sin((i / (bars - 1)) * Math.PI), 0.7);
}

function vocalPeaks(now: number, energy: number): number[] {
  return Array.from({ length: VOCAL_BARS }, (_, i) => {
    const t = i / (VOCAL_BARS - 1);
    const breathe = 0.9 + 0.1 * Math.sin(now / 210);
    const ripple = 0.78 + 0.22 * Math.sin(now / 155 + t * Math.PI * 2.2);
    return Math.min(1, envelope(i, VOCAL_BARS) * breathe * (0.28 + ripple * energy));
  });
}

function beatPeaks(now: number, energy: number): number[] {
  const kick = Math.pow(Math.max(0, Math.sin(now / 200)), 10);
  return Array.from({ length: BEAT_BARS }, (_, i) => {
    const t = i / (BEAT_BARS - 1);
    const bass = Math.exp(-t * 2.8) * (0.5 + 0.5 * Math.abs(Math.sin(now / 170)));
    const lowMid = Math.exp(-Math.pow((t - 0.22) * 3.6, 2)) * (0.32 + 0.48 * Math.abs(Math.sin(now / 130 + 0.8)));
    const mid = Math.exp(-Math.pow((t - 0.48) * 4.2, 2)) * (0.2 + 0.4 * Math.abs(Math.sin(now / 95 + 1.6)));
    const high = Math.exp(-Math.pow((t - 0.78) * 5.5, 2)) * (0.1 + 0.28 * Math.abs(Math.sin(now / 70 + i * 0.35)));
    const thump = t < 0.14 ? kick * 0.55 : 0;
    return Math.min(1, (bass * 0.85 + lowMid * 0.7 + mid * 0.55 + high + thump) * (0.42 + energy * 0.58));
  });
}

function spectrumFromBins(bins: Uint8Array, count: number): number[] {
  const n = bins.length;
  return Array.from({ length: count }, (_, i) => {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    const start = Math.floor(Math.pow(t0, 1.55) * n);
    const end = Math.max(start + 1, Math.floor(Math.pow(t1, 1.55) * n));
    let max = 0;
    for (let j = start; j < end && j < n; j += 1) max = Math.max(max, bins[j] ?? 0);
    const falloff = 1 - Math.pow(i / (count - 1), 1.35) * 0.22;
    return Math.min(1, Math.max(0.07, Math.pow(max / 255, 0.72) * falloff));
  });
}

function peaksFor(kind: RecorderKind, now: number, energy: number) {
  return kind === 'beat' ? beatPeaks(now, energy) : vocalPeaks(now, energy);
}

export function useRecorder(kind: RecorderKind = 'vocal') {
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[]>(() => peaksFor(kind, 0, 0.7));
  const [elapsedMs, setElapsedMs] = useState(0);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const raf = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const binsRef = useRef<Uint8Array | null>(null);
  const liveRef = useRef(false);
  const kindRef = useRef(kind);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    kindRef.current = kind;
  }, [kind]);

  useEffect(() => {
    const tick = (now: number) => {
      const analyser = analyserRef.current;
      const bins = binsRef.current;
      let energy = liveRef.current ? 0.88 : 0.72;
      if (analyser && bins && liveRef.current) {
        analyser.getByteFrequencyData(bins as Uint8Array<ArrayBuffer>);
        let sum = 0;
        for (const n of bins) sum += n;
        energy = 0.58 + Math.min(0.42, (sum / bins.length / 255) * 1.35);
        if (kindRef.current === 'beat') {
          const liveSpec = spectrumFromBins(bins, BEAT_BARS);
          const shaped = beatPeaks(now, energy);
          setPeaks(liveSpec.map((h, i) => Math.min(1, Math.max(h, (shaped[i] ?? 0) * 0.4))));
        } else {
          setPeaks(peaksFor(kindRef.current, now, energy));
        }
      } else {
        setPeaks(peaksFor(kindRef.current, now, energy));
      }
      if (liveRef.current && started.current) {
        setElapsedMs(Date.now() - started.current);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setElapsedMs(0);
    started.current = Date.now();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('no-mic');
      setLive(true);
      log.warn('recorder.mock', { reason: 'no-mediaDevices' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      recorder.start(80);
      media.current = recorder;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = kindRef.current === 'beat' ? 256 : 128;
      source.connect(analyser);
      analyserRef.current = analyser;
      binsRef.current = new Uint8Array(analyser.frequencyBinCount);
      setLive(true);
      log.info('recorder.start', { mime: recorder.mimeType, kind: kindRef.current });
    } catch (err) {
      setError('denied');
      setLive(true);
      log.warn('recorder.denied', { message: String(err) });
    }
  }, []);

  const stop = useCallback(async () => {
    const durationMs = Math.max(400, Date.now() - (started.current || Date.now()));
    const recorder = media.current;
    setLive(false);
    analyserRef.current = null;
    binsRef.current = null;
    if (!recorder || recorder.state === 'inactive') {
      log.info('recorder.mock-stop', { durationMs });
      return {
        durationMs,
        mimeType: 'audio/webm',
        storagePath: `local://mock/${Date.now()}`,
        peaks,
      };
    }
    await Promise.race([
      new Promise<void>((resolve) => {
        const done = () => resolve();
        recorder.addEventListener('stop', done, { once: true });
        try {
          recorder.stop();
        } catch {
          done();
        }
        recorder.stream.getTracks().forEach((t) => t.stop());
      }),
      new Promise<void>((resolve) => window.setTimeout(resolve, 800)),
    ]);
    const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' });
    const storagePath = URL.createObjectURL(blob);
    log.info('recorder.stop', { durationMs, bytes: blob.size });
    return {
      durationMs,
      mimeType: blob.type || 'audio/webm',
      storagePath,
      peaks,
    };
  }, [peaks]);

  const reset = useCallback(() => {
    setLive(false);
    setElapsedMs(0);
    started.current = 0;
    analyserRef.current = null;
    binsRef.current = null;
  }, []);

  const step: ProcessStep = processStepAt(elapsedMs);

  return { live, error, start, stop, reset, peaks, elapsedMs, step };
}
