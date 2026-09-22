import type { ParsedMusicIntent } from './types';

/**
 * MUSIC INTENT PARSER
 *
 * Kullanıcının doğal dilde yazdığı istekleri (Türkçe ve İngilizce)
 * müzikal niyet bileşenlerine (mood, enerji, enstrüman, BPM, vokal ve negatif etiketler)
 * ayrıştıran zeka katmanıdır.
 */
export function parseMusicIntent(rawText: string): ParsedMusicIntent {
  const text = (rawText || '').toLowerCase().trim();

  const moods: string[] = [];
  const genres: string[] = [];
  const instrumentation: string[] = [];
  const avoidTags: string[] = [];
  let energy = 0.55;
  let scene: string | undefined;
  let vocalGender: 'm' | 'f' | undefined;
  let vocalStyle: 'intimate' | 'aggressive' | 'melodic' | 'breathy' | 'raw' = 'melodic';
  let minBpm = 90;
  let maxBpm = 130;

  // 1. Mood Detection
  if (text.includes('karanlık') || text.includes('dark')) {
    moods.push('dark', 'atmospheric');
    energy = Math.min(energy, 0.48);
  }
  if (text.includes('duygusal') || text.includes('emotional') || text.includes('hüzün')) {
    moods.push('emotional', 'melancholic');
  }
  if (text.includes('enerjik') || text.includes('energetic') || text.includes('energy') || text.includes('hareketli') || text.includes('hızlı')) {
    moods.push('energetic', 'driving');
    energy = Math.max(energy, 0.85);
    minBpm = 125;
    maxBpm = 150;
  }
  if (text.includes('sakin') || text.includes('chill') || text.includes('relax') || text.includes('dinlendirici')) {
    moods.push('chill', 'laid-back', 'meditative');
    energy = Math.min(energy, 0.35);
    minBpm = 75;
    maxBpm = 95;
  }
  if (text.includes('romantik') || text.includes('romantic') || text.includes('aşk')) {
    moods.push('romantic', 'intimate');
  }

  // 2. Scene Detection
  if (text.includes('araba') || text.includes('sürerken') || text.includes('drive') || text.includes('driving')) {
    scene = 'night driving';
    moods.push('hypnotic', 'road-trip');
  } else if (text.includes('spor') || text.includes('workout') || text.includes('gym')) {
    scene = 'workout';
    energy = 0.9;
  } else if (text.includes('gece') || text.includes('night')) {
    scene = 'late night';
    moods.push('nocturnal');
  }

  // 3. Genre Detection
  if (text.includes('rock') || text.includes('alternatif')) {
    genres.push('alternative rock', 'indie rock');
    if (!instrumentation.includes('electric guitar')) instrumentation.push('electric guitar');
  }
  if (text.includes('trap') || text.includes('808') || text.includes('drill')) {
    genres.push('melodic trap', 'hip hop');
    instrumentation.push('punchy 808 sub-bass', 'crisp hi-hats');
    minBpm = 130;
    maxBpm = 145;
  }
  if (text.includes('pop')) {
    genres.push('modern pop');
  }
  if (text.includes('r&b') || text.includes('rnb') || text.includes('soul')) {
    genres.push('contemporary R&B', 'neo-soul');
    instrumentation.push('warm Rhodes piano', 'smooth bassline');
    minBpm = 85;
    maxBpm = 110;
  }
  if (text.includes('akustik') || text.includes('acoustic')) {
    genres.push('acoustic folk', 'indie');
    instrumentation.push('acoustic guitar', 'soft shaker');
  }
  if (
    text.includes('electronic') ||
    text.includes('elektronik') ||
    text.includes('synth') ||
    text.includes('techno') ||
    text.includes('edm') ||
    text.includes('house')
  ) {
    genres.push('electronic synthwave', 'electronic dance');
    instrumentation.push('analog synthesizer', 'driving synth bass');
  }

  // 4. Vocal Preference Detection
  if (text.includes('kadın') || text.includes('female') || text.includes('bayan')) {
    vocalGender = 'f';
    vocalStyle = text.includes('fısıltı') || text.includes('soft') ? 'breathy' : 'intimate';
  } else if (text.includes('erkek') || text.includes('male')) {
    vocalGender = 'm';
  }

  // 5. Instrumentation
  if (text.includes('gitar') || text.includes('guitar')) {
    if (!instrumentation.includes('electric guitar')) instrumentation.push('warm electric guitar');
  }
  if (text.includes('piyano') || text.includes('piano')) {
    instrumentation.push('felt grand piano');
  }
  if (text.includes('davul') || text.includes('drum') || text.includes('ritim')) {
    instrumentation.push('organic acoustic drums');
  }

  // 6. Avoid / Negation Detection ("çok depresif olmayan", "sert olmasın", "metal olmasın")
  if (text.includes('depresif olmayan') || text.includes('not depressing') || text.includes('çok hüzünlü olmasın')) {
    avoidTags.push('extreme depressing sorrow', 'crying sad ballad');
  }
  if (text.includes('sert olmasın') || text.includes('not heavy') || text.includes('metal olmasın')) {
    avoidTags.push('heavy metal', 'screaming vocals', 'harsh distortion', 'grindcore');
  }
  if (text.includes('elektronik olmasın') || text.includes('no edm')) {
    avoidTags.push('harsh EDM synths', 'dubstep drops', 'over-quantized beats');
  }

  // Fallbacks if empty
  if (genres.length === 0) genres.push('melodic atmospheric track');
  if (moods.length === 0) moods.push('warm', 'evocative');
  if (instrumentation.length === 0) instrumentation.push('melodic harmony', 'soft groove');

  return {
    rawPrompt: rawText,
    moods,
    energy,
    genres,
    vocal: {
      gender: vocalGender,
      style: vocalStyle,
      energy: vocalGender === 'f' ? 0.45 : 0.6,
    },
    instrumentation,
    tempoRange: { minBpm, maxBpm },
    scene,
    avoidTags,
  };
}
