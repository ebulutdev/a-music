import { AgentError } from '../shared/errors';

export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MIN_AUDIO_DURATION_MS = 400; // 0.4 seconds
export const MAX_AUDIO_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_CHANNELS = 8;
export const MAX_SAMPLE_RATE_HZ = 192000;

export const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
]);

/**
 * Sanitizes user-provided audio filenames to prevent Directory/Path Traversal
 * (e.g., ../../secret.txt, C:\Windows\System32, null byte attacks).
 */
export function sanitizeAudioFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'audio_take.wav';
  }

  // Detect and reject path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    // Strip paths and dangerous sequences
    const stripped = filename
      .replace(/\0/g, '')
      .split(/[/\\]+/)
      .pop() || 'audio_take.wav';

    // Remove any remaining path traversal dots
    const cleaned = stripped.replace(/^\.+/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    return cleaned || 'audio_take.wav';
  }

  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export type AudioUploadMeta = {
  sizeBytes: number;
  mimeType: string;
  durationMs?: number;
  filename?: string;
  sampleRate?: number;
  channels?: number;
};

/**
 * Validates audio upload parameters, limits, and MIME integrity.
 */
export function validateAudioUpload(meta: AudioUploadMeta): void {
  if (meta.filename) {
    if (
      meta.filename.includes('..') ||
      meta.filename.includes('\0') ||
      meta.filename.includes('/') ||
      meta.filename.includes('\\')
    ) {
      throw new AgentError(
        'AUDIO_PATH_TRAVERSAL',
        `[Güvenlik]: Dosya adında yetkisiz dizin atlama ('..') veya yol ayırıcı tespit edildi: ${meta.filename}`,
      );
    }
  }

  if (meta.sizeBytes <= 0) {
    throw new AgentError('AUDIO_EMPTY_FILE', 'Ses dosyası boş olamaz (0 bayt).');
  }

  if (meta.sizeBytes > MAX_AUDIO_SIZE_BYTES) {
    throw new AgentError(
      'AUDIO_TOO_LARGE',
      `Ses dosyası boyutu sınırı aştı (${(meta.sizeBytes / (1024 * 1024)).toFixed(1)}MB > 50MB).`,
    );
  }

  const mime = meta.mimeType.toLowerCase().trim();
  if (!ALLOWED_AUDIO_MIMES.has(mime) && !mime.startsWith('audio/')) {
    throw new AgentError(
      'AUDIO_INVALID_MIME',
      `Desteklenmeyen veya geçersiz ses formatı (${mime}). Yalnızca MP3, WAV, WebM, FLAC, OGG kabul edilir.`,
    );
  }

  if (meta.durationMs != null) {
    if (meta.durationMs < MIN_AUDIO_DURATION_MS) {
      throw new AgentError('AUDIO_TOO_SHORT', `Ses kaydı çok kısa (${meta.durationMs}ms < 400ms).`);
    }
    if (meta.durationMs > MAX_AUDIO_DURATION_MS) {
      throw new AgentError(
        'AUDIO_TOO_LONG',
        `Ses kaydı maksimum süreyi aştı (${Math.round(meta.durationMs / 60000)} dakika > 30 dakika).`,
      );
    }
  }

  if (meta.channels && meta.channels > MAX_CHANNELS) {
    throw new AgentError('AUDIO_CHANNELS_EXCEEDED', `Kanal sayısı (${meta.channels}) desteklenmiyor (maks. 8).`);
  }

  if (meta.sampleRate && (meta.sampleRate < 8000 || meta.sampleRate > MAX_SAMPLE_RATE_HZ)) {
    throw new AgentError(
      'AUDIO_INVALID_SAMPLE_RATE',
      `Örnekleme hızı (${meta.sampleRate} Hz) geçerli aralıkta değil (8000 - 192000 Hz).`,
    );
  }
}

/**
 * Enforces cross-user audio clip access isolation.
 * A user must never access another user's uploaded vocal.
 */
export function assertClipOwnership(clipOwnerUserId: string | undefined, requestingUserId: string): void {
  if (!clipOwnerUserId) return; // public seed clip
  if (clipOwnerUserId !== requestingUserId) {
    throw new AgentError(
      'FORBIDDEN_AUDIO_ACCESS',
      `Yetkisiz erişim: Bu ses kaydına (${clipOwnerUserId}) erişim yetkiniz bulunmamaktadır.`,
    );
  }
}
