import { describe, expect, it } from 'vitest';
import { diagnoseKieError, KIE_ERROR_CATALOG, validateAudioUrlForKie } from './diagnostics';

describe('Kie Diagnostics Engine', () => {
  it('diagnoses 401 Unauthorized with Turkish root cause and solution', () => {
    expect(KIE_ERROR_CATALOG[401].code).toBe(401);
    const err = diagnoseKieError(401, 'Invalid Bearer token', '/api/v1/jobs/createTask', {});
    expect(err.message).toContain('API Anahtarı eksik, geçersiz');
    expect(err.message).toContain('VITE_SUNO_API_KEY');
  });

  it('diagnoses 402 Insufficient Credits with clear action', () => {
    const err = diagnoseKieError(402, 'out of credits', '/api/v1/jobs/createTask', {});
    expect(err.message).toContain('yetersiz');
    expect(err.message).toContain('VITE_USE_MOCK_SUNO=true');
  });

  it('diagnoses 422 Validation Error with actionable guidance', () => {
    const err = diagnoseKieError(422, 'title length > 100', '/api/v1/jobs/createTask', {});
    expect(err.message).toContain('Validation Error');
    expect(err.message).toContain('title <= 100');
  });

  it('rejects blob and local URLs when mock mode is false', () => {
    expect(() => {
      validateAudioUrlForKie('blob:http://localhost:5173/12345', 'Cover', false);
    }).toThrow(/yerel bellek adresidir/);

    expect(() => {
      validateAudioUrlForKie('local://saved/take1', 'Cover', false);
    }).toThrow(/yerel bellek adresidir/);
  });

  it('allows valid HTTPS URLs', () => {
    expect(() => {
      validateAudioUrlForKie('https://storage.example.com/audio.mp3', 'Cover', false);
    }).not.toThrow();
  });

  it('allows local URLs in mock mode', () => {
    expect(() => {
      validateAudioUrlForKie('blob:http://localhost:5173/12345', 'Cover', true);
    }).not.toThrow();
  });
});
