import { describe, expect, it } from 'vitest';
import {
  validateKieGenerateRequest,
  validateKieMashupRequest,
  validateWeightRange,
} from '../agents/suno/validation';
import type { SunoGenerateRequest } from '../agents/suno/types';

describe('Kie.ai Request Data Validation Tests', () => {
  it('rejects out-of-range weights: audio_weight, style_weight, weirdness_constraint', () => {
    // Negative weights
    expect(() => validateWeightRange('audio_weight', -1)).toThrow(/0.0 ile 1.0 arasında/i);
    expect(() => validateWeightRange('style_weight', -0.5)).toThrow(/0.0 ile 1.0 arasında/i);
    expect(() => validateWeightRange('weirdness_constraint', -1)).toThrow(/0.0 ile 1.0 arasında/i);

    // Weights greater than 1.0
    expect(() => validateWeightRange('audio_weight', 2)).toThrow(/0.0 ile 1.0 arasında/i);
    expect(() => validateWeightRange('style_weight', 1.5)).toThrow(/0.0 ile 1.0 arasında/i);
    expect(() => validateWeightRange('weirdness_constraint', 2.2)).toThrow(/0.0 ile 1.0 arasında/i);

    // Valid bounds
    expect(() => validateWeightRange('audio_weight', 0.0)).not.toThrow();
    expect(() => validateWeightRange('style_weight', 0.65)).not.toThrow();
    expect(() => validateWeightRange('weirdness_constraint', 1.0)).not.toThrow();
    expect(() => validateWeightRange('audio_weight', undefined)).not.toThrow();
  });

  it('rejects unsupported models', () => {
    const invalidReq: SunoGenerateRequest = {
      model: 'unsupported-model-v99' as unknown as SunoGenerateRequest['model'],
      customMode: false,
      instrumental: false,
      prompt: 'Synthwave track',
    };

    expect(() => validateKieGenerateRequest(invalidReq)).toThrow(/Desteklenmeyen model/i);
  });

  it('validates custom mode requirements (title and at least one content tag)', () => {
    // Missing title
    expect(() =>
      validateKieGenerateRequest({
        model: 'V6_WILD',
        customMode: true,
        instrumental: false,
        title: '',
        style: 'Pop',
        lyrics: 'La la la',
        prompt: 'La la la',
      }),
    ).toThrow(/Custom modda 'title' \(başlık\) zorunludur/i);

    // Completely empty content
    expect(() =>
      validateKieGenerateRequest({
        model: 'V6_WILD',
        customMode: true,
        instrumental: false,
        title: 'Valid Title',
        style: '',
        lyrics: '',
        prompt: '',
        negativeTags: '',
      }),
    ).toThrow(/en az biri dolu olmalıdır/i);
  });

  it('enforces character limits across models', () => {
    // V6_WILD title limit is 100
    expect(() =>
      validateKieGenerateRequest({
        model: 'V6_WILD',
        customMode: true,
        instrumental: false,
        title: 'A'.repeat(105),
        style: 'Pop',
      }),
    ).toThrow(/başlık uzunluğu/i);

    // V4 title limit is 80
    expect(() =>
      validateKieGenerateRequest({
        model: 'V4',
        customMode: true,
        instrumental: false,
        title: 'A'.repeat(85),
        style: 'Pop',
      }),
    ).toThrow(/80 karakteri aşamaz/i);

    // Non-custom prompt limit is 500
    expect(() =>
      validateKieGenerateRequest({
        model: 'V6_WILD',
        customMode: false,
        instrumental: false,
        prompt: 'A'.repeat(505),
      }),
    ).toThrow(/prompt 500 karakteri aşamaz/i);
  });

  it('validates mashup requires exactly 2 URLs', () => {
    expect(() => validateKieMashupRequest(['https://cdn.com/1.mp3'], true)).toThrow(
      /tam olarak 2 ses bağlantısı/i,
    );
    expect(() =>
      validateKieMashupRequest(
        ['https://cdn.com/1.mp3', 'https://cdn.com/2.mp3', 'https://cdn.com/3.mp3'],
        true,
      ),
    ).toThrow(/tam olarak 2 ses bağlantısı/i);

    expect(() =>
      validateKieMashupRequest(['https://cdn.com/1.mp3', 'https://cdn.com/2.mp3'], true),
    ).not.toThrow();
  });
});
