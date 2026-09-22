import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';

const log = createLogger('vocal-humanizer');

export type VocalHumanizerPreset =
  | 'human-natural'
  | 'vocal-doubles'
  | 'trap-autotune'
  | 'silk-acoustic'
  | 'hyper-human'
  | 'warm-gold'
  | 'custom';

export type VocalLayerConfig = {
  id: string;
  name: string;
  pan: number; // -1 (left) to +1 (right)
  delayMs: number; // micro-timing offset
  pitchOffsetCents: number; // micro-detune / harmony shift
  gain: number; // 0 to 1
  vibratoDepth: number;
  vibratoRateHz: number;
  role: 'lead' | 'double_l' | 'double_r' | 'harmony_high' | 'harmony_low' | 'adlib';
};

export type VocalHumanizerOptions = {
  preset: VocalHumanizerPreset;
  // Pitch & Timbre
  pitchCorrectionSpeed: number; // 0 = 100% human glide, 100 = instant T-Pain snap
  pitchDriftCents: number; // 0 to 15 cents natural micro-drift
  formantPreserve: boolean; // Preserves vocal tract resonance
  vibratoDepth: number; // 0 to 1
  vibratoRateHz: number; // 4.5 to 6.5 Hz
  vibratoDelayMs: number; // 150 to 350 ms after note onset
  // Layers & Stereo Positioning
  doublerEnabled: boolean;
  doublerSpread: number; // 0 to 1 stereo width
  doublerLeftOffsetMs: number; // e.g. +18ms
  doublerRightOffsetMs: number; // e.g. -12ms
  harmoniesEnabled: boolean;
  harmonyLevel: number; // 0 to 1
  // Micro-timing & Breaths
  humanizeTimingMs: number; // micro-swing off rigid grid (-20ms to +20ms)
  breathPreservation: boolean;
  pauseDetection: boolean;
  // Analog Studio DSP Chain
  highPassCutoffHz: number; // 60-120 Hz
  deEsserFrequencyHz: number; // 5000-8000 Hz
  warmSaturation: number; // 0 to 1 (analog tube warmth)
  reverbWet: number; // 0 to 1
};

export const HUMANIZER_PRESETS: Record<VocalHumanizerPreset, VocalHumanizerOptions> = {
  'human-natural': {
    preset: 'human-natural',
    pitchCorrectionSpeed: 18,
    pitchDriftCents: 6.5,
    formantPreserve: true,
    vibratoDepth: 0.35,
    vibratoRateHz: 5.2,
    vibratoDelayMs: 240,
    doublerEnabled: false,
    doublerSpread: 0.3,
    doublerLeftOffsetMs: 18,
    doublerRightOffsetMs: -12,
    harmoniesEnabled: false,
    harmonyLevel: 0.25,
    humanizeTimingMs: 12,
    breathPreservation: true,
    pauseDetection: true,
    highPassCutoffHz: 80,
    deEsserFrequencyHz: 6800,
    warmSaturation: 0.15,
    reverbWet: 0.2,
  },
  'vocal-doubles': {
    preset: 'vocal-doubles',
    pitchCorrectionSpeed: 35,
    pitchDriftCents: 5.0,
    formantPreserve: true,
    vibratoDepth: 0.4,
    vibratoRateHz: 5.0,
    vibratoDelayMs: 200,
    doublerEnabled: true,
    doublerSpread: 0.4, // -20% and +20%
    doublerLeftOffsetMs: 18,
    doublerRightOffsetMs: -12,
    harmoniesEnabled: true,
    harmonyLevel: 0.35,
    humanizeTimingMs: 15,
    breathPreservation: true,
    pauseDetection: true,
    highPassCutoffHz: 85,
    deEsserFrequencyHz: 7000,
    warmSaturation: 0.22,
    reverbWet: 0.28,
  },
  'silk-acoustic': {
    preset: 'silk-acoustic',
    pitchCorrectionSpeed: 12,
    pitchDriftCents: 5.5,
    formantPreserve: true,
    vibratoDepth: 0.3,
    vibratoRateHz: 5.4,
    vibratoDelayMs: 280,
    doublerEnabled: false,
    doublerSpread: 0.25,
    doublerLeftOffsetMs: 14,
    doublerRightOffsetMs: -10,
    harmoniesEnabled: false,
    harmonyLevel: 0.2,
    humanizeTimingMs: 10,
    breathPreservation: true,
    pauseDetection: true,
    highPassCutoffHz: 75,
    deEsserFrequencyHz: 6400,
    warmSaturation: 0.25,
    reverbWet: 0.35,
  },
  'trap-autotune': {
    preset: 'trap-autotune',
    pitchCorrectionSpeed: 95,
    pitchDriftCents: 1.0,
    formantPreserve: false,
    vibratoDepth: 0.1,
    vibratoRateHz: 4.8,
    vibratoDelayMs: 100,
    doublerEnabled: true,
    doublerSpread: 0.5,
    doublerLeftOffsetMs: 22,
    doublerRightOffsetMs: -18,
    harmoniesEnabled: true,
    harmonyLevel: 0.4,
    humanizeTimingMs: 4,
    breathPreservation: false,
    pauseDetection: false,
    highPassCutoffHz: 110,
    deEsserFrequencyHz: 7500,
    warmSaturation: 0.45,
    reverbWet: 0.25,
  },
  'warm-gold': {
    preset: 'warm-gold',
    pitchCorrectionSpeed: 30,
    pitchDriftCents: 4.5,
    formantPreserve: true,
    vibratoDepth: 0.4,
    vibratoRateHz: 5.1,
    vibratoDelayMs: 220,
    doublerEnabled: false,
    doublerSpread: 0.3,
    doublerLeftOffsetMs: 16,
    doublerRightOffsetMs: -12,
    harmoniesEnabled: true,
    harmonyLevel: 0.3,
    humanizeTimingMs: 14,
    breathPreservation: true,
    pauseDetection: true,
    highPassCutoffHz: 80,
    deEsserFrequencyHz: 6600,
    warmSaturation: 0.38,
    reverbWet: 0.24,
  },
  'hyper-human': {
    preset: 'hyper-human',
    pitchCorrectionSpeed: 8,
    pitchDriftCents: 8.0,
    formantPreserve: true,
    vibratoDepth: 0.5,
    vibratoRateHz: 5.6,
    vibratoDelayMs: 260,
    doublerEnabled: false,
    doublerSpread: 0.2,
    doublerLeftOffsetMs: 15,
    doublerRightOffsetMs: -10,
    harmoniesEnabled: false,
    harmonyLevel: 0.15,
    humanizeTimingMs: 18,
    breathPreservation: true,
    pauseDetection: true,
    highPassCutoffHz: 70,
    deEsserFrequencyHz: 6500,
    warmSaturation: 0.18,
    reverbWet: 0.22,
  },
  custom: {
    preset: 'custom',
    pitchCorrectionSpeed: 25,
    pitchDriftCents: 6.0,
    formantPreserve: true,
    vibratoDepth: 0.35,
    vibratoRateHz: 5.2,
    vibratoDelayMs: 220,
    doublerEnabled: true,
    doublerSpread: 0.35,
    doublerLeftOffsetMs: 18,
    doublerRightOffsetMs: -12,
    harmoniesEnabled: false,
    harmonyLevel: 0.3,
    humanizeTimingMs: 12,
    breathPreservation: true,
    pauseDetection: true,
    highPassCutoffHz: 80,
    deEsserFrequencyHz: 6800,
    warmSaturation: 0.25,
    reverbWet: 0.25,
  },
};

// ==========================================
// 1. Turkish Text Normalizer for Speech & Lyrics
// ==========================================

const TR_ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

export function numberToTurkishWords(num: number): string {
  if (num === 0) return 'sıfır';
  if (!Number.isFinite(num)) return String(num);

  const parts: string[] = [];
  const n = Math.floor(Math.abs(num));

  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('bin');
    } else {
      parts.push(numberToTurkishWords(thousands), 'bin');
    }
  }

  if (remainder > 0) {
    const hundreds = Math.floor(remainder / 100);
    const tens = Math.floor((remainder % 100) / 10);
    const ones = remainder % 10;

    if (hundreds > 0) {
      if (hundreds > 1) parts.push(TR_ONES[hundreds]);
      parts.push('yüz');
    }
    if (tens > 0) parts.push(TR_TENS[tens]);
    if (ones > 0) parts.push(TR_ONES[ones]);
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Normalizes numbers, percentages, currency, and symbols in Turkish lyrics or text
 * into phonetically readable words for more human and natural vocal synthesis.
 */
export function normalizeTurkishSpeechText(text: string): string {
  if (!text) return '';

  let out = text;

  // Normalise percentages: %2,35 or %15
  out = out.replace(/%(\d+)(?:[.,](\d+))?/g, (_, intPart, decPart) => {
    const intWord = numberToTurkishWords(Number(intPart));
    if (decPart) {
      const decWord = numberToTurkishWords(Number(decPart));
      return `yüzde ${intWord} virgül ${decWord}`;
    }
    return `yüzde ${intWord}`;
  });

  // Normalise currency: 100 TL, 50$, 20€
  out = out.replace(/(\d+)\s*TL/gi, (_, n) => `${numberToTurkishWords(Number(n))} Türk lirası`);
  out = out.replace(/(\d+)\s*\$/g, (_, n) => `${numberToTurkishWords(Number(n))} dolar`);
  out = out.replace(/(\d+)\s*€/g, (_, n) => `${numberToTurkishWords(Number(n))} euro`);

  // Normalise standalone numbers (up to 9999)
  out = out.replace(/\b\d+\b/g, (match) => {
    const num = Number(match);
    return num <= 99999 ? numberToTurkishWords(num) : match;
  });

  // Common musical / speech symbols
  out = out.replace(/&/g, ' ve ');
  out = out.replace(/\+/g, ' artı ');
  out = out.replace(/BIST/gi, 'bist');
  out = out.replace(/AI/gi, 'yapay zeka');

  return out.replace(/\s+/g, ' ').trim();
}

// ==========================================
// 2. Speech Performance Planner
// ==========================================

export type SpeechPerformancePlan = {
  originalText: string;
  normalizedText: string;
  emotion: 'confident' | 'melancholic' | 'energetic' | 'intimate' | 'chill';
  estimatedDurationSec: number;
  pausePoints: Array<{ wordIndex: number; durationMs: number }>;
  breathPoints: Array<{ wordIndex: number }>;
  prosody: {
    energy: number; // 0 to 1
    pitchVarianceCents: number;
    timingDeviationMs: number;
  };
};

export function planSpeechPerformance(
  text: string,
  options?: Partial<VocalHumanizerOptions>,
): SpeechPerformancePlan {
  const norm = normalizeTurkishSpeechText(text);
  const words = norm.split(/\s+/).filter(Boolean);
  const opts = { ...HUMANIZER_PRESETS['human-natural'], ...options };

  // Determine emotional mood from keywords
  const lower = norm.toLowerCase();
  let emotion: SpeechPerformancePlan['emotion'] = 'chill';
  if (lower.includes('aşk') || lower.includes('özlem') || lower.includes('gece') || lower.includes('sessiz')) {
    emotion = 'intimate';
  } else if (lower.includes('ateş') || lower.includes('koş') || lower.includes('ritim') || lower.includes('dans')) {
    emotion = 'energetic';
  } else if (lower.includes('hüzün') || lower.includes('gitti') || lower.includes('yalnız') || lower.includes('acı')) {
    emotion = 'melancholic';
  } else if (lower.includes('hedef') || lower.includes('zirve') || lower.includes('güçlü') || lower.includes('ben')) {
    emotion = 'confident';
  }

  const pausePoints: Array<{ wordIndex: number; durationMs: number }> = [];
  const breathPoints: Array<{ wordIndex: number }> = [];

  // Realistic human breathing: insertion every 6-9 words, or after punctuation
  let lastBreathWord = 0;
  words.forEach((w, idx) => {
    const isClauseEnd = w.includes(',') || w.includes('.') || w.includes(';') || w.includes('!');
    if (isClauseEnd) {
      pausePoints.push({ wordIndex: idx, durationMs: Math.round(180 + Math.random() * 120) });
    }
    if (opts.breathPreservation && idx - lastBreathWord >= 7) {
      breathPoints.push({ wordIndex: idx });
      lastBreathWord = idx;
    }
  });

  const estimatedDurationSec = Math.max(1.5, words.length * 0.42 + pausePoints.length * 0.2);

  return {
    originalText: text,
    normalizedText: norm,
    emotion,
    estimatedDurationSec,
    pausePoints,
    breathPoints,
    prosody: {
      energy: emotion === 'energetic' ? 0.88 : emotion === 'intimate' ? 0.52 : 0.7,
      pitchVarianceCents: opts.pitchDriftCents,
      timingDeviationMs: opts.humanizeTimingMs,
    },
  };
}

// ==========================================
// 3. Vocal Arrangement Generator (Doubles, Harmonies, Stereo Spread)
// ==========================================

export type VocalArrangementPlan = {
  layers: VocalLayerConfig[];
  totalLayers: number;
  stereoWidthPercent: number;
  harmoniesIncluded: boolean;
  masterGain: number;
};

export function planVocalArrangement(
  _lyrics: string,
  options?: Partial<VocalHumanizerOptions>,
): VocalArrangementPlan {
  const opts = { ...HUMANIZER_PRESETS['vocal-doubles'], ...options };
  const layers: VocalLayerConfig[] = [];

  // 1. Lead Vocal (Always Center, dry & present)
  layers.push({
    id: createId('layer'),
    name: 'Lead Vocal (Center)',
    role: 'lead',
    pan: 0,
    delayMs: 0,
    pitchOffsetCents: 0,
    gain: 1.0,
    vibratoDepth: opts.vibratoDepth,
    vibratoRateHz: opts.vibratoRateHz,
  });

  // 2. Double Vocal Left (+18ms, -20% Pan)
  if (opts.doublerEnabled) {
    const spread = opts.doublerSpread;
    layers.push({
      id: createId('layer'),
      name: 'Double Vocal (Left)',
      role: 'double_l',
      pan: -spread, // e.g. -0.2 to -0.4
      delayMs: opts.doublerLeftOffsetMs, // +18ms
      pitchOffsetCents: Number((Math.random() * 4 + 2).toFixed(1)), // +2 to +6 cents detune
      gain: 0.65,
      vibratoDepth: opts.vibratoDepth * 0.85,
      vibratoRateHz: opts.vibratoRateHz * 0.98,
    });

    // 3. Double Vocal Right (-12ms, +20% Pan)
    layers.push({
      id: createId('layer'),
      name: 'Double Vocal (Right)',
      role: 'double_r',
      pan: spread, // e.g. +0.2 to +0.4
      delayMs: opts.doublerRightOffsetMs, // -12ms
      pitchOffsetCents: Number((-Math.random() * 4 - 2).toFixed(1)), // -2 to -6 cents detune
      gain: 0.65,
      vibratoDepth: opts.vibratoDepth * 0.85,
      vibratoRateHz: opts.vibratoRateHz * 1.02,
    });
  }

  // 4. Harmonies (+3 / -4 semitones with soft saturation)
  if (opts.harmoniesEnabled) {
    layers.push({
      id: createId('layer'),
      name: 'Harmony 3rd High',
      role: 'harmony_high',
      pan: 0.35,
      delayMs: 14,
      pitchOffsetCents: 300 + opts.pitchDriftCents, // +300 cents (Minor 3rd)
      gain: opts.harmonyLevel * 0.75,
      vibratoDepth: opts.vibratoDepth * 1.1,
      vibratoRateHz: opts.vibratoRateHz,
    });
    layers.push({
      id: createId('layer'),
      name: 'Harmony 4th Low',
      role: 'harmony_low',
      pan: -0.35,
      delayMs: 10,
      pitchOffsetCents: -500 - opts.pitchDriftCents, // -500 cents (Perfect 4th below)
      gain: opts.harmonyLevel * 0.65,
      vibratoDepth: opts.vibratoDepth,
      vibratoRateHz: opts.vibratoRateHz * 0.96,
    });
  }

  return {
    layers,
    totalLayers: layers.length,
    stereoWidthPercent: Math.round(opts.doublerSpread * 100),
    harmoniesIncluded: opts.harmoniesEnabled,
    masterGain: layers.length > 3 ? 0.85 : 1.0,
  };
}

// ==========================================
// 4. Harmonic Key & Beat Prompt Aligner
// ==========================================

export function generateHarmonicBeatPrompt(input: {
  userPrompt: string;
  vocalPeaks?: number[];
  autotonePreset?: string;
  vocalGender?: 'm' | 'f';
  style?: string;
}): { prompt: string; style: string; tags: string } {
  const cleanPrompt = (input.userPrompt || '').trim();
  const lower = cleanPrompt.toLowerCase();

  let detectedGenre = 'Melodic Trap';
  let bpmHint = '130 BPM';
  let mood = 'atmospheric, emotive';

  if (lower.includes('drill') || lower.includes('808')) {
    detectedGenre = 'UK Drill / Trap';
    bpmHint = '142 BPM';
    mood = 'dark, punchy 808, sliding sub bass';
  } else if (lower.includes('akustik') || lower.includes('slow') || lower.includes('piyano')) {
    detectedGenre = 'Acoustic Pop & Piano';
    bpmHint = '95 BPM';
    mood = 'warm, emotional grand piano, soft percussion';
  } else if (lower.includes('afro') || lower.includes('yaz')) {
    detectedGenre = 'Afrobeats / Dancehall';
    bpmHint = '105 BPM';
    mood = 'tropical rhythm, warm log drums, bouncy groove';
  } else if (lower.includes('rnb') || lower.includes('gece') || lower.includes('soul')) {
    detectedGenre = 'Dark R&B / Neo-Soul';
    bpmHint = '118 BPM';
    mood = 'lush chords, analog tape saturation, silky groove';
  } else if (lower.includes('rock') || lower.includes('gitar')) {
    detectedGenre = 'Indie Alt-Rock';
    bpmHint = '125 BPM';
    mood = 'overdriven rhythm guitars, dynamic live drums';
  }

  // Vocal pocket engineering: ensure the beat frequencies carve room for vocals (800Hz - 3.5kHz)
  const vocalPocketInstruction =
    'carved vocal pocket in mid frequencies, wide stereo imaging, crystal clear mix, radio master';

  const finalStyle = input.style || detectedGenre;
  const finalTags = `${detectedGenre}, ${bpmHint}, ${mood}, ${vocalPocketInstruction}`;
  const finalPrompt = cleanPrompt
    ? `${cleanPrompt}, studio quality ${detectedGenre} beat, ${mood}, ${bpmHint}`
    : `A smooth professional ${detectedGenre} instrumental beat with ${mood}`;

  log.info('vocal-humanizer.beat_aligned', {
    detectedGenre,
    bpmHint,
    finalTags,
  });

  return {
    prompt: finalPrompt,
    style: finalStyle,
    tags: finalTags,
  };
}

// ==========================================
// 5. Extensible Plugin & Modifier Registry
// ==========================================

export type VocalModifierFn = (
  context: {
    plan: VocalArrangementPlan;
    options: VocalHumanizerOptions;
    metadata: Record<string, unknown>;
  },
) => VocalArrangementPlan;

const customModifiers = new Map<string, VocalModifierFn>();

export function registerCustomVocalModifier(name: string, fn: VocalModifierFn): void {
  customModifiers.set(name, fn);
  log.info('vocal-humanizer.registered_modifier', { name });
}

export function applyCustomVocalModifiers(
  plan: VocalArrangementPlan,
  options: VocalHumanizerOptions,
  metadata: Record<string, unknown> = {},
): VocalArrangementPlan {
  let current = plan;
  for (const [name, fn] of customModifiers.entries()) {
    try {
      current = fn({ plan: current, options, metadata });
    } catch (err) {
      log.warn('vocal-humanizer.modifier_error', { name, error: String(err) });
    }
  }
  return current;
}

// ==========================================
// 6. Web Audio Studio DSP Chain Construction
// ==========================================

export function createStudioVocalGraph(
  audioCtx: AudioContext,
  sourceNode: AudioNode,
  options: VocalHumanizerOptions,
): { outputNode: AudioNode; cleanup: () => void } {
  // 1. High-Pass Filter (removes rumble below 80Hz)
  const highPass = audioCtx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.setValueAtTime(options.highPassCutoffHz, audioCtx.currentTime);

  // 2. De-Esser Notch Filter (attenuates harsh sibilance)
  const deEsser = audioCtx.createBiquadFilter();
  deEsser.type = 'peaking';
  deEsser.frequency.setValueAtTime(options.deEsserFrequencyHz, audioCtx.currentTime);
  deEsser.Q.setValueAtTime(3.5, audioCtx.currentTime);
  deEsser.gain.setValueAtTime(-3.5, audioCtx.currentTime);

  // 3. Dynamic Compressor (smooths dynamic peaks)
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-22, audioCtx.currentTime);
  compressor.knee.setValueAtTime(10, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(3.2, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.015, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

  // 4. Analog Tube Saturation (Waveshaper)
  const saturation = audioCtx.createWaveShaper();
  if (options.warmSaturation > 0.05) {
    const k = options.warmSaturation * 35;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; i += 1) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    saturation.curve = curve;
  }

  // 5. Output Gain
  const outputGain = audioCtx.createGain();
  outputGain.gain.setValueAtTime(0.95, audioCtx.currentTime);

  // Connect Audio Graph Chain
  sourceNode.connect(highPass);
  highPass.connect(deEsser);
  deEsser.connect(compressor);
  compressor.connect(saturation);
  saturation.connect(outputGain);

  return {
    outputNode: outputGain,
    cleanup: () => {
      try {
        sourceNode.disconnect();
        highPass.disconnect();
        deEsser.disconnect();
        compressor.disconnect();
        saturation.disconnect();
        outputGain.disconnect();
      } catch {
        // cleanup safe ignore
      }
    },
  };
}
