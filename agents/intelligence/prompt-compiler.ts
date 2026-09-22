import type { CompiledMusicPrompt, ParsedMusicIntent, UserTasteVector, VocalProfileAnalysis } from './types';

/**
 * MUSIC PROMPT COMPILER
 *
 * User Intent + Vocal Profile + User Taste Vector + Negative Filters
 * bileşenlerini harmanlayarak Kie.ai V6_WILD modeline en üst kalitede
 * optimize edilmiş prompt ve parametre setini derler.
 */
export function compileMusicPrompt(input: {
  intent: ParsedMusicIntent;
  vocalProfile?: VocalProfileAnalysis;
  tasteVector?: UserTasteVector;
  titleSuggestion?: string;
}): CompiledMusicPrompt {
  const { intent, vocalProfile, tasteVector } = input;

  // 1. Determine Musical Key & Tempo
  const bpm = vocalProfile?.estimatedBpm || Math.round((intent.tempoRange.minBpm + intent.tempoRange.maxBpm) / 2);
  const key = (vocalProfile?.key && vocalProfile.key !== 'unknown') ? vocalProfile.key : 'F# minor';

  // 2. Build Structured Genre & Style
  const topGenre = intent.genres[0] || 'Alternative rock';
  const subGenre = intent.genres[1] || 'Atmospheric indie';
  const compiledStyle = `${topGenre}, ${subGenre}, ${bpm} BPM, ${key}`.slice(0, 1000);

  // 3. Compose Comprehensive Multi-Section Prompt
  const promptSections: string[] = [];

  // Genre & Tonal Center
  promptSections.push(`${topGenre} / ${subGenre}.`);
  promptSections.push(`${bpm} BPM, ${key} tonal center.`);

  // Vocal Character & Texture
  if (intent.vocal.gender) {
    const genderLabel = intent.vocal.gender === 'f' ? 'female' : 'male';
    const char = vocalProfile?.vocalCharacter.join(' and ') || 'intimate and expressive';
    promptSections.push(`Vocal character: ${char} ${genderLabel} vocal.`);
    promptSections.push('Natural breath dynamics and close-mic feeling.');
  }

  // Instrumentation based on intent and vocal pocket
  const instruments = [
    ...intent.instrumentation,
    ...(vocalProfile?.recommendedInstruments || []),
  ];
  const uniqueInstruments = Array.from(new Set(instruments)).slice(0, 5);
  promptSections.push(`Instrumentation: ${uniqueInstruments.join(', ')}.`);

  // Atmosphere & Scene
  if (intent.scene) {
    promptSections.push(`Atmosphere: ${intent.scene} vibe, ${intent.moods.join(' and ')}.`);
  } else {
    promptSections.push(`Mood: ${intent.moods.join(' and ')}.`);
  }

  // Production Quality & Spatial Mix
  promptSections.push('Organic dynamics, carved vocal pocket in mids, wide warm stereo mix.');

  // 4. Combine Negative / Avoid Tags
  const allAvoid = [
    ...intent.avoidTags,
    ...(tasteVector?.negativeTagsHistory || []),
    'harsh digital clipping',
    'over-quantized lifeless rhythm',
  ];
  const uniqueAvoid = Array.from(new Set(allAvoid)).slice(0, 10).join(', ');

  // 5. Calculate Kie Weights based on Vocal Profile and Human Preference
  let audioWeight = 0.75;
  let styleWeight = 0.72;
  let weirdnessConstraint = 0.28;

  if (vocalProfile) {
    // If a vocal reference exists, weight the audio higher
    audioWeight = 0.86;
    styleWeight = 0.68;
    weirdnessConstraint = 0.25; // Keep experimental deviation tight to protect vocal match
  }

  const title = input.titleSuggestion || `${topGenre.split(' ')[0]} - ${intent.scene || 'Session'}`.slice(0, 80);

  return {
    prompt: promptSections.join(' ').slice(0, 5000),
    style: compiledStyle,
    title,
    negativeTags: uniqueAvoid,
    vocalGender: intent.vocal.gender,
    styleWeight,
    weirdnessConstraint,
    audioWeight,
    model: 'V6_WILD',
    customMode: true,
    metadata: {
      compiledTempo: bpm,
      compiledKey: key,
      targetMood: intent.moods[0] || 'atmospheric',
      intelligenceApplied: true,
    },
  };
}
