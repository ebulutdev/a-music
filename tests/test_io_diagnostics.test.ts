import { describe, expect, it } from 'vitest';
import {
  analyzeVocalProfile,
  assertClipOwnership,
  assertSafeExternalUrl,
  compileMusicPrompt,
  diagnoseKieError,
  getUserTasteVector,
  handleKieWebhook,
  HUMANIZER_PRESETS,
  KIE_ERROR_CATALOG,
  normalizeTurkishSpeechText,
  parseMusicIntent,
  planSpeechPerformance,
  planVocalArrangement,
  rerankCandidates,
  sanitizeAudioFilename,
  sanitizeUserPrompt,
  updateUserTasteFromFeedback,
  validateAudioUpload,
  validateAudioUrlForKie,
  validateKieGenerateRequest,
  formatMobileAccepted,
  sanitizeErrorMessage,
  type CandidateTrack,
} from '@agents';
import { FIREBASE_COLLECTIONS } from '../database/firebase-collections';
import { upsertLocal, resetAllLocal } from '../agents/shared/persist';
import { resetWebhookReplayCache } from '../agents/suno/webhook';

describe('DIAGNOSTICS & INPUT/OUTPUT TEST SUITE', () => {
  // ==========================================================================
  // SECTION 1: KIE.AI ERROR CODE DIAGNOSTIC ENGINE
  // ==========================================================================
  describe('1. Kie.ai HTTP Status Code Diagnostics (Root Cause & Actionable Fixes)', () => {
    it('diagnoses 401 Unauthorized: detects missing/invalid API key with solution', () => {
      const diag = diagnoseKieError(401, 'Unauthorized request', '/api/v1/jobs/createTask', {});
      expect(diag.code).toBe('KIE_API_ERROR');
      expect(diag.message).toContain('401');
      expect(diag.message).toContain('Unauthorized');
      expect(diag.message).toContain('VITE_SUNO_API_KEY');
      expect(diag.message).toContain('Bearer token');
    });

    it('diagnoses 402 Insufficient Credits: points to billing and mock mode toggle', () => {
      const diag = diagnoseKieError(402, 'out of credits', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('402');
      expect(diag.message).toContain('Insufficient Credits');
      expect(diag.message).toContain('kredi');
      expect(diag.message).toContain('VITE_USE_MOCK_SUNO=true');
    });

    it('diagnoses 404 Not Found: explains endpoint or task ID mismatch', () => {
      const diag = diagnoseKieError(404, 'Task suno_123 does not exist', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('404');
      expect(diag.message).toContain('Not Found');
      expect(diag.message).toContain('task_id');
    });

    it('diagnoses 408 Upstream Timeout: explains 10-minute generation limit', () => {
      const diag = diagnoseKieError(408, 'Gateway timeout', '/api/v1/jobs/recordInfo', {});
      expect(diag.message).toContain('408');
      expect(diag.message).toContain('Upstream Timeout');
      expect(diag.message).toContain('10 dakika');
    });

    it('diagnoses 409 Conflict: duplicate session or generation ID', () => {
      const diag = diagnoseKieError(409, 'Conflict detected', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Conflict');
      expect(diag.message).toContain('zaten mevcut');
    });

    it('diagnoses 422 Validation Error: guides user on model limits and custom_mode', () => {
      const diag = diagnoseKieError(422, 'title length > 100', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Validation Error');
      expect(diag.message).toContain('title <= 100');
      expect(diag.message).toContain('custom_mode');
    });

    it('diagnoses 429 Rate Limited: guides on backoff and throttle intervals', () => {
      const diag = diagnoseKieError(429, 'Too many requests', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Rate Limited');
      expect(diag.message).toContain('maksimum istek kotası');
    });

    it('diagnoses 451 Media Fetch Failed: warns about unreachable CDN / public URL', () => {
      const diag = diagnoseKieError(451, 'Could not download media', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Media Fetch Failed');
      expect(diag.message).toContain('upload_url');
      expect(diag.message).toContain('HTTPS');
    });

    it('diagnoses 455 Service Maintenance: alerts about scheduled provider downtime', () => {
      const diag = diagnoseKieError(455, 'Service unavailable', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Service Maintenance');
      expect(diag.message).toContain('bakım modunda');
    });

    it('diagnoses 500 Internal Server Error: checks Kie upstream failure', () => {
      const diag = diagnoseKieError(500, 'Server crashed', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Internal Server Error');
      expect(diag.message).toContain('sunucu tarafında');
    });

    it('diagnoses 501 Generation Failed: prompts user to simplify musical prompt', () => {
      const diag = diagnoseKieError(501, 'Model inference failed', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Generation Failed');
      expect(diag.message).toContain('basitleştirip');
    });

    it('diagnoses 505 Feature Disabled: suggests model alternatives like V6 or V6_WILD', () => {
      const diag = diagnoseKieError(505, 'Model disabled', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Feature Disabled');
      expect(diag.message).toContain('V6 veya V6_WILD');
    });

    it('diagnoses unknown status codes gracefully with fallback structure', () => {
      const diag = diagnoseKieError(599, 'Custom vendor issue', '/api/v1/jobs/createTask', {});
      expect(diag.message).toContain('Unknown Error');
      expect(diag.message).toContain('599');
      expect(diag.message).toContain('Custom vendor issue');
    });
  });

  // ==========================================================================
  // SECTION 2: INPUT VALIDATION & SECURITY DIAGNOSTICS
  // ==========================================================================
  describe('2. Input Validation Diagnostics', () => {
    it('diagnoses local blob: URLs as invalid for live Kie.ai API calls', () => {
      expect(() =>
        validateAudioUrlForKie('blob:http://localhost:5173/uuid-audio-clip', 'Cover audio', false)
      ).toThrow(/tarayıcının yerel bellek adresidir/i);
    });

    it('diagnoses local:// URLs as invalid for live Kie.ai API calls', () => {
      expect(() =>
        validateAudioUrlForKie('local://recordings/take_1', 'Mashup track 1', false)
      ).toThrow(/tarayıcının yerel bellek adresidir/i);
    });

    it('allows blob: URLs when isMock is true for local testing', () => {
      expect(() =>
        validateAudioUrlForKie('blob:http://localhost:5173/uuid-audio-clip', 'Cover audio', true)
      ).not.toThrow();
    });

    it('diagnoses non-HTTP/HTTPS URLs as invalid schemes', () => {
      expect(() =>
        validateAudioUrlForKie('ftp://files.example.com/audio.wav', 'Upload test', false)
      ).toThrow(/geçerli bir web adresi değil/i);
    });

    it('diagnoses empty audio URL inputs', () => {
      expect(() => validateAudioUrlForKie('', 'Cover upload', false)).toThrow(/boş bırakılamaz/i);
      expect(() => validateAudioUrlForKie('   ', 'Cover upload', false)).toThrow(/boş bırakılamaz/i);
    });

    it('diagnoses oversized audio upload (>50MB)', () => {
      expect(() =>
        validateAudioUpload({
          sizeBytes: 52 * 1024 * 1024,
          durationMs: 60000,
          mimeType: 'audio/mpeg',
          filename: 'heavy_file.mp3',
        })
      ).toThrow(/50MB/i);
    });

    it('diagnoses undersized audio upload (<400ms)', () => {
      expect(() =>
        validateAudioUpload({
          sizeBytes: 20000,
          durationMs: 300,
          mimeType: 'audio/wav',
          filename: 'click.wav',
        })
      ).toThrow(/400ms/i);
    });

    it('diagnoses unsupported audio MIME types', () => {
      expect(() =>
        validateAudioUpload({
          sizeBytes: 100000,
          durationMs: 5000,
          mimeType: 'text/html',
          filename: 'evil.html',
        })
      ).toThrow(/Desteklenmeyen veya geçersiz ses formatı/i);
    });

    it('diagnoses and neutralizes filename path traversal attempts', () => {
      const sanitized = sanitizeAudioFilename('../../../Windows/System32/drivers/etc/hosts');
      expect(sanitized).toBe('hosts');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    });

    it('diagnoses cross-user audio clip access violations', () => {
      expect(() => assertClipOwnership('user_alice', 'user_bob')).toThrow(/Yetkisiz erişim/i);
      expect(() => assertClipOwnership('user_alice', 'user_alice')).not.toThrow();
    });
  });

  // ==========================================================================
  // SECTION 3: OUTPUT SANITIZATION & MOBILE CONTRACT DIAGNOSTICS
  // ==========================================================================
  describe('3. Output Formatting & Safe Contract Diagnostics', () => {
    it('formats 202 Accepted asynchronous mobile contract correctly', () => {
      const res = formatMobileAccepted('gen_xyz');

      expect(res.statusCode).toBe(202);
      expect(res.success).toBe(true);
      expect(res.data?.generation_id).toBe('gen_xyz');
      expect(res.data?.status).toBe('queued');
      expect(res.error).toBeUndefined();
    });

    it('masks Bearer tokens, internal paths, and internal IPs in error outputs', () => {
      const internalErr =
        'Database connection failed at C:\\Users\\pc\\secret.ts: Failed with Bearer secret_kie_key_1234 to 192.168.1.100';

      const safeMessage = sanitizeErrorMessage(internalErr);
      expect(safeMessage).not.toContain('secret_kie_key_1234');
      expect(safeMessage).not.toContain('C:\\Users\\pc');
      expect(safeMessage).not.toContain('192.168.1.100');
      expect(safeMessage).toContain('Bearer [REDACTED]');
      expect(safeMessage).toContain('[internal_path]');
      expect(safeMessage).toContain('[internal_ip]');
    });
  });

  // ==========================================================================
  // SECTION 4: ACOUSTIC PROFILE & PHONETIC NORMALIZATION DIAGNOSTICS
  // ==========================================================================
  describe('4. Acoustic Profile & Speech Output Diagnostics', () => {
    it('diagnoses silence accurately without fabricating musical keys or BPM', () => {
      const silentProfile = analyzeVocalProfile({
        vocalId: 'voc_zero',
        peaks: [0, 0, 0, 0],
        durationMs: 2500,
      });

      expect(silentProfile.estimatedBpm).toBeNull();
      expect(silentProfile.key).toBe('unknown');
      expect(silentProfile.energy).toBe(0);
      expect(silentProfile.vocalCharacter).toContain('silent');
    });

    it('diagnoses rich vocal signal with accurate harmonic key and BPM estimation', () => {
      const vocal = analyzeVocalProfile({
        vocalId: 'voc_studio',
        peaks: [0.35, 0.65, 0.9, 0.7, 0.45],
        durationMs: 4000,
      });

      expect(vocal.estimatedBpm).toBeGreaterThan(60);
      expect(vocal.key).not.toBe('unknown');
      expect(vocal.energy).toBeGreaterThan(0.3);
      expect(vocal.vocalPocket.lowCutHz).toBe(85);
    });

    it('diagnoses and expands complex Turkish currency, numbers and percentages', () => {
      const testCases = [
        { input: '15 TL', expected: 'on beş Türk lirası' },
        { input: '%25', expected: 'yüzde yirmi beş' },
        { input: '2024 yılında', expected: 'iki bin yirmi dört yılında' },
        { input: '50$', expected: 'elli dolar' },
      ];

      for (const tc of testCases) {
        const normalized = normalizeTurkishSpeechText(tc.input);
        expect(normalized).toContain(tc.expected);
      }
    });
  });
});
