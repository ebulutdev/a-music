import { AgentError } from '../shared/errors';
import { assertSafeExternalUrl } from '../security/ssrf';
import type { SunoGenerateRequest } from './types';

export const SUPPORTED_KIE_MODELS = new Set<string>([
  'V6_WILD',
  'V6',
  'V6_MINI',
  'V5_5',
  'V5',
  'V4_5ALL',
  'V4_5PLUS',
  'V4_5',
  'V4',
]);

/**
 * Validates weight parameters: must be between 0.0 and 1.0.
 * Throws AgentError if out of bounds.
 */
export function validateWeightRange(name: string, val: number | undefined): void {
  if (val == null) return;
  if (typeof val !== 'number' || isNaN(val)) {
    throw new AgentError('KIE_PARAM_TYPE', `${name} sayısal bir değer olmalıdır.`);
  }
  if (val < 0.0 || val > 1.0) {
    throw new AgentError(
      'KIE_PARAM_RANGE',
      `${name} (${val}) geçerli aralıkta değil. 0.0 ile 1.0 arasında olmalıdır.`,
    );
  }
}

/**
 * Validates outgoing Kie generate request before submission.
 */
export function validateKieGenerateRequest(req: SunoGenerateRequest, isMock = false): void {
  // 1. Model Check
  const model = req.model || 'V6_WILD';
  if (!SUPPORTED_KIE_MODELS.has(model)) {
    throw new AgentError(
      'KIE_INVALID_MODEL',
      `Desteklenmeyen model: '${model}'. Desteklenen modeller: ${Array.from(SUPPORTED_KIE_MODELS).join(', ')}`,
    );
  }

  // 2. Weight ranges
  validateWeightRange('audio_weight', req.audioWeight);
  validateWeightRange('style_weight', req.styleWeight);
  validateWeightRange('weirdness_constraint', req.weirdnessConstraint);

  // 3. Callback URL security (SSRF check)
  if (req.callBackUrl) {
    if (!isMock) {
      assertSafeExternalUrl(req.callBackUrl, 'callBackUrl');
    }
  }

  const isLegacyV4 = model === 'V4';
  const maxTitleLen = isLegacyV4 ? 80 : 100;
  const maxPromptLen = isLegacyV4 ? 3000 : 5000;
  const maxStyleLen = isLegacyV4 ? 200 : 1000;

  // 4. Custom Mode validation
  if (req.customMode) {
    if (!req.title || !req.title.trim()) {
      throw new AgentError('KIE_REQUIRED_FIELD', "Custom modda 'title' (başlık) zorunludur.");
    }
    if (req.title.length > maxTitleLen) {
      throw new AgentError(
        'KIE_TITLE_LENGTH',
        `Başlık uzunluğu ${model} için ${maxTitleLen} karakteri aşamaz (alınan: ${req.title.length}).`,
      );
    }

    // At least one of style, lyrics, prompt, or negative_tags must be provided
    const hasStyle = Boolean(req.style?.trim());
    const hasLyrics = Boolean(req.lyrics?.trim());
    const hasPrompt = Boolean(req.prompt?.trim());
    const hasNegative = Boolean(req.negativeTags?.trim());

    if (!hasStyle && !hasLyrics && !hasPrompt && !hasNegative) {
      throw new AgentError(
        'KIE_EMPTY_CONTENT',
        "Custom modda 'style', 'lyrics' veya 'negative_tags' alanlarından en az biri dolu olmalıdır.",
      );
    }

    if (req.style && req.style.length > maxStyleLen) {
      throw new AgentError(
        'KIE_STYLE_LENGTH',
        `Stil alanı ${model} için ${maxStyleLen} karakteri aşamaz (alınan: ${req.style.length}).`,
      );
    }

    const lyricsOrPrompt = req.lyrics || req.prompt || '';
    if (!req.instrumental && lyricsOrPrompt.length > maxPromptLen) {
      throw new AgentError(
        'KIE_PROMPT_LENGTH',
        `Söz/Prompt alanı ${model} için ${maxPromptLen} karakteri aşamaz (alınan: ${lyricsOrPrompt.length}).`,
      );
    }
  } else {
    // Non-custom mode
    if (!req.prompt || !req.prompt.trim()) {
      throw new AgentError('KIE_REQUIRED_FIELD', "Standart modda 'prompt' alanı zorunludur.");
    }
    if (req.prompt.length > 500) {
      throw new AgentError(
        'KIE_PROMPT_LENGTH',
        `Standart modda prompt 500 karakteri aşamaz (alınan: ${req.prompt.length}).`,
      );
    }
    if (req.imageUrls && req.imageUrls.length > 5) {
      throw new AgentError('KIE_IMAGE_LIMIT', 'En fazla 5 adet görsel URL eklenebilir.');
    }
  }
}

/**
 * Validates outgoing Kie mashup request
 */
export function validateKieMashupRequest(uploadUrlList: string[], isMock = false): void {
  if (!Array.isArray(uploadUrlList) || uploadUrlList.length !== 2) {
    throw new AgentError(
      'KIE_MASHUP_URLS',
      "Mashup işlemi tam olarak 2 ses bağlantısı ('upload_url_list') gerektirir.",
    );
  }
  for (const url of uploadUrlList) {
    if (!url || typeof url !== 'string') {
      throw new AgentError('KIE_MASHUP_URL_EMPTY', 'Geçersiz ses bağlantısı.');
    }
    if (!isMock) {
      assertSafeExternalUrl(url, 'upload_url_list');
    }
  }
}
