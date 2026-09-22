/**
 * ============================================================================
 * MUSIC INTELLIGENCE PIPELINE (KİŞİSELLEŞTİRİLMİŞ MÜZİK ZEKA ORKESTRASYONU)
 * ============================================================================
 *
 * NASIL ÇALIŞIR:
 * 1. Kullanıcıdan gelen ham metin isteğini ayrıştırır (Intent Parser).
 * 2. Varsa kullanıcının vokal kaydını analiz eder (Vocal Analyzer).
 * 3. Kullanıcının geçmiş müzik zevkini ve geri bildirimlerini çeker (Preference Engine).
 * 4. Kie.ai için V6_WILD modeline özel optimize parametreleri derler (Prompt Compiler).
 * 5. Üretilen aday parçalar arasından teknik uyumluluk skoruna göre en iyisini seçer (Reranker).
 *
 * ⚠️ KOLAYCA KALDIRMA / DEVRE DIŞI BIRAKMA:
 * Bu sistemi istemezseniz aşağıdaki `USE_INTELLIGENCE_LAYER` değişkenini `false` yapmanız
 * veya bu klasörü (`agents/intelligence`) silmeniz yeterlidir. Diğer kodlara hiçbir yan etkisi yoktur.
 * ============================================================================
 */

import { parseMusicIntent } from './intent-parser';
import { getUserTasteVector } from './preference-engine';
import { compileMusicPrompt } from './prompt-compiler';
import { rerankCandidates } from './reranker';
import type { CandidateTrack, CompiledMusicPrompt, VocalProfileAnalysis } from './types';
import { analyzeVocalProfile } from './vocal-analyzer';

/**
 * Bu özellik bayrağı (feature-flag) ile zeka katmanını anında açıp kapatabilirsiniz.
 * Testler için varsayılan olarak aktiftir.
 */
export const USE_INTELLIGENCE_LAYER = true;

export type IntelligencePipelineInput = {
  userId: string;
  userPrompt: string;
  vocalClip?: {
    id: string;
    peaks?: number[];
    durationMs: number;
    label?: string;
  };
  titleSuggestion?: string;
};

export type IntelligencePipelineResult = {
  compiledPrompt: CompiledMusicPrompt;
  vocalProfile?: VocalProfileAnalysis;
  bestTrack?: CandidateTrack;
  metadata: {
    intelligenceEnabled: boolean;
    processingTimeMs: number;
  };
};

/**
 * Kişiselleştirilmiş müzik üretim akışını yöneten ana fonksiyon.
 */
export function runMusicIntelligencePipeline(
  input: IntelligencePipelineInput,
  candidateTracks?: CandidateTrack[],
): IntelligencePipelineResult {
  const start = performance.now();

  // Eğer katman devre dışı bırakılmışsa ham değerleri doğrudan döner
  if (!USE_INTELLIGENCE_LAYER) {
    return {
      compiledPrompt: {
        prompt: input.userPrompt,
        style: 'Pop',
        title: input.titleSuggestion || 'Song',
        negativeTags: '',
        styleWeight: 0.65,
        weirdnessConstraint: 0.65,
        audioWeight: 0.65,
        model: 'V6_WILD',
        customMode: false,
        metadata: {
          compiledTempo: 120,
          compiledKey: 'C major',
          targetMood: 'neutral',
          intelligenceApplied: false,
        },
      },
      metadata: {
        intelligenceEnabled: false,
        processingTimeMs: performance.now() - start,
      },
    };
  }

  // 1. Kullanıcı niyetini ayrıştır
  const intent = parseMusicIntent(input.userPrompt);

  // 2. Vokal kaydı varsa analiz et
  let vocalProfile: VocalProfileAnalysis | undefined;
  if (input.vocalClip) {
    vocalProfile = analyzeVocalProfile({
      vocalId: input.vocalClip.id,
      peaks: input.vocalClip.peaks,
      durationMs: input.vocalClip.durationMs,
      label: input.vocalClip.label,
    });
  }

  // 3. Kullanıcı zevk profilini al
  const tasteVector = getUserTasteVector(input.userId);

  // 4. Kie için nihai müzik promptunu derle
  const compiledPrompt = compileMusicPrompt({
    intent,
    vocalProfile,
    tasteVector,
    titleSuggestion: input.titleSuggestion,
  });

  // 5. Aday parçalar varsa teknik uyumluluk skorlaması ile yeniden sırala
  let bestTrack: CandidateTrack | undefined;
  if (candidateTracks && candidateTracks.length > 0) {
    const rerankResult = rerankCandidates({
      candidates: candidateTracks,
      compiledPrompt,
      vocalProfile,
      tasteVector,
    });
    bestTrack = rerankResult.bestTrack;
  }

  return {
    compiledPrompt,
    vocalProfile,
    bestTrack,
    metadata: {
      intelligenceEnabled: true,
      processingTimeMs: Number((performance.now() - start).toFixed(2)),
    },
  };
}
