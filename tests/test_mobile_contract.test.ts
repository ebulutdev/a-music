import { describe, expect, it } from 'vitest';
import { AgentError } from '../agents/shared/errors';
import {
  formatMobileAccepted,
  formatMobileError,
  formatMobileSuccess,
  sanitizeErrorMessage,
} from '../agents/shared/mobile-contract';

describe('Mobile Contract & Error Sanitization Tests', () => {
  it('formats asynchronous 202 Accepted response for music generation', () => {
    const res = formatMobileAccepted('gen_async_123');

    expect(res.statusCode).toBe(202);
    expect(res.success).toBe(true);
    expect(res.data?.generation_id).toBe('gen_async_123');
    expect(res.data?.status).toBe('queued');
    expect(res.error).toBeUndefined();
  });

  it('formats standardized 200 OK response with clean payload', () => {
    const res = formatMobileSuccess({
      song_id: 'song_456',
      title: 'Glass Hour',
      audio_url: 'https://cdn.example.com/audio.mp3',
    });

    expect(res.statusCode).toBe(200);
    expect(res.success).toBe(true);
    expect(res.data.song_id).toBe('song_456');
  });

  it('sanitizes errors and hides Bearer tokens, internal paths, and internal IPs', () => {
    const rawLeak =
      'Exception in C:\\Users\\pc\\OneDrive\\Desktop\\aımusıc\\agents\\suno\\client.ts: ' +
      'Failed connecting to 192.168.1.50 with Authorization: Bearer secret_kie_key_1234567890abcdef1234567890';

    const safeMessage = sanitizeErrorMessage(rawLeak);

    // Assert zero leakage of paths, IPs, or credentials
    expect(safeMessage.includes('C:\\Users\\')).toBe(false);
    expect(safeMessage.includes('192.168.1.50')).toBe(false);
    expect(safeMessage.includes('secret_kie_key')).toBe(false);
    expect(safeMessage.includes('[internal_path]')).toBe(true);
    expect(safeMessage.includes('[internal_ip]')).toBe(true);
    expect(safeMessage.includes('Bearer [REDACTED]')).toBe(true);
  });

  it('formats standardized safe mobile error envelope', () => {
    const err = new AgentError('KIE_RATE_LIMIT', 'Too many requests. Please wait 10 seconds.');
    const res = formatMobileError(err);

    expect(res.statusCode).toBe(400);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe('KIE_RATE_LIMIT');
    expect(res.error?.message).toBe('Too many requests. Please wait 10 seconds.');
    expect(res.error?.request_id.startsWith('req_')).toBe(true);
  });
});
