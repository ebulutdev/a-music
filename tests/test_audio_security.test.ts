import { describe, expect, it } from 'vitest';
import {
  assertClipOwnership,
  sanitizeAudioFilename,
  validateAudioUpload,
} from '../agents/security/audio';

describe('Audio Upload Security Tests', () => {
  it('blocks huge audio files (> 50MB)', () => {
    expect(() =>
      validateAudioUpload({
        sizeBytes: 52 * 1024 * 1024,
        mimeType: 'audio/mpeg',
        durationMs: 60000,
      }),
    ).toThrow(/boyutu sınırı aştı/i);
  });

  it('blocks empty audio files (0 bytes)', () => {
    expect(() =>
      validateAudioUpload({
        sizeBytes: 0,
        mimeType: 'audio/wav',
        durationMs: 1000,
      }),
    ).toThrow(/boş olamaz/i);
  });

  it('blocks invalid or fake MIME types', () => {
    const maliciousMimes = [
      'application/x-sh',
      'text/html',
      'image/png',
      'application/javascript',
      'video/mp4',
    ];

    for (const mime of maliciousMimes) {
      expect(() =>
        validateAudioUpload({
          sizeBytes: 1024,
          mimeType: mime,
          durationMs: 5000,
        }),
      ).toThrow(/Desteklenmeyen veya geçersiz ses formatı/i);
    }
  });

  it('detects and blocks path traversal in filenames', () => {
    const maliciousFilenames = [
      '../../secret.txt',
      '..\\..\\windows\\system32\\cmd.exe',
      '/etc/passwd',
      '../../../etc/shadow\0.wav',
    ];

    for (const filename of maliciousFilenames) {
      expect(() =>
        validateAudioUpload({
          sizeBytes: 1024,
          mimeType: 'audio/mpeg',
          filename,
        }),
      ).toThrow(/dizin atlama/i);

      // Verify sanitizer neutralizes it safely
      const cleaned = sanitizeAudioFilename(filename);
      expect(cleaned.includes('..')).toBe(false);
      expect(cleaned.includes('/')).toBe(false);
      expect(cleaned.includes('\\')).toBe(false);
      expect(cleaned.includes('\0')).toBe(false);
    }
  });

  it('enforces audio duration bounds (400ms to 30min)', () => {
    // Too short
    expect(() =>
      validateAudioUpload({
        sizeBytes: 1000,
        mimeType: 'audio/wav',
        durationMs: 200,
      }),
    ).toThrow(/çok kısa/i);

    // Too long (31 minutes)
    expect(() =>
      validateAudioUpload({
        sizeBytes: 1000,
        mimeType: 'audio/wav',
        durationMs: 31 * 60 * 1000,
      }),
    ).toThrow(/maksimum süreyi aştı/i);
  });

  it('enforces user ownership isolation', () => {
    // Different user accessing clip
    expect(() => assertClipOwnership('user_alice', 'user_bob')).toThrow(/Yetkisiz erişim/i);

    // Same user accessing clip
    expect(() => assertClipOwnership('user_alice', 'user_alice')).not.toThrow();

    // Public seed clip (no owner)
    expect(() => assertClipOwnership(undefined, 'user_alice')).not.toThrow();
  });
});
