import { describe, expect, it } from 'vitest';
import { assertSafeExternalUrl, isSafeExternalUrl } from '../agents/security/ssrf';

describe('SSRF Guardrail Tests', () => {
  const maliciousUrls = [
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:8080/admin',
    'http://0.0.0.0',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]',
    'http://10.0.0.1/internal-api',
    'http://172.16.0.5:5000',
    'http://192.168.1.1/router',
    'file:///etc/passwd',
    'gopher://127.0.0.1:6379',
    'ftp://127.0.0.1',
    'javascript:alert(1)',
    'http://metadata.google.internal/computeMetadata/v1/',
  ];

  for (const url of maliciousUrls) {
    it(`blocks SSRF target: ${url}`, () => {
      expect(isSafeExternalUrl(url)).toBe(false);
      expect(() => assertSafeExternalUrl(url, 'Audio URL')).toThrow(/SSRF|Boş URL/i);
    });
  }

  const legitimateUrls = [
    'https://cdn.example.com/audio/track1.mp3',
    'https://storage.googleapis.com/music-bucket/vocal.wav',
    'https://api.kie.ai/callback/webhook',
    'https://res.cloudinary.com/demo/video/upload/sample.mp3',
  ];

  for (const url of legitimateUrls) {
    it(`allows legitimate public URL: ${url}`, () => {
      expect(isSafeExternalUrl(url)).toBe(true);
      expect(() => assertSafeExternalUrl(url, 'Audio URL')).not.toThrow();
    });
  }
});
