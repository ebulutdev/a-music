import { describe, expect, it } from 'vitest';
import { getSunoClient, shouldUseMockSuno } from './client';
import { mockSunoClient, resetMockSuno } from './mock';

describe('suno client', () => {
  it('defaults to mock without a live key', () => {
    expect(shouldUseMockSuno()).toBe(true);
    expect(getSunoClient()).toBe(mockSunoClient);
  });

  it('returns a ready mock generate task under 50ms', async () => {
    resetMockSuno();
    const start = performance.now();
    const task = await mockSunoClient.generate({
      customMode: false,
      instrumental: false,
      model: 'V5',
      prompt: 'sunset pop',
    });
    expect(task.status).toBe('ready');
    expect(task.taskId.startsWith('suno_')).toBe(true);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
