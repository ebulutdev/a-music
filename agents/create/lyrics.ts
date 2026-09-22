import { createLogger } from '../shared/logger';
import type { SunoModel } from '../shared/types';

const log = createLogger('lyrics');

const LIMITS: Record<SunoModel, number> = {
  V4: 3000,
  V4_5: 5000,
  V4_5PLUS: 5000,
  V4_5ALL: 5000,
  V5: 5000,
  V5_5: 5000,
  V6: 5000,
  V6_WILD: 5000,
  V6_MINI: 5000,
};


export type LyricsReport = {
  valid: boolean;
  charCount: number;
  language: 'tr' | 'en' | 'mixed';
  issues: Array<'lyrics.short' | 'lyrics.limit' | 'lyrics.readable'>;
  model: SunoModel;
  max: number;
};

export function detectLanguage(text: string): LyricsReport['language'] {
  const trHits = (text.match(/[çğıöşüÇĞİÖŞÜ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (trHits > 0 && latin > trHits * 4) return 'mixed';
  if (trHits > 0) return 'tr';
  return 'en';
}

export function checkLyrics(body: string, model: SunoModel): LyricsReport {
  const trimmed = body.replace(/\s+/g, ' ').trim();
  const issues: LyricsReport['issues'] = [];
  const charCount = body.length;
  const max = LIMITS[model];

  if (trimmed.length < 8) issues.push('lyrics.short');
  if (charCount > max) issues.push('lyrics.limit');
  if (!/[\n,]|[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(body)) issues.push('lyrics.readable');

  const report: LyricsReport = {
    valid: issues.length === 0,
    charCount,
    language: detectLanguage(body),
    issues,
    model,
    max,
  };
  log.debug('lyrics.check', { ...report });
  return report;
}
