import { describe, expect, it, beforeEach } from 'vitest';
import { clearLogBuffer, createLogger, getLogBuffer, logsFor } from './logger';
import { assertBudget, measure } from './perf';
import { createId } from './ids';

describe('logger + perf', () => {
  beforeEach(() => clearLogBuffer());

  it('writes structured entries with firebase collection hint', () => {
    const log = createLogger('vocal');
    log.info('vocal.saved', { clipId: 'clip_1' });
    const entries = logsFor('vocal');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.event).toBe('vocal.saved');
    expect(log.collection).toBe('agent_logs');
    expect(getLogBuffer()[0]?.id.startsWith('log_')).toBe(true);
  });

  it('stays inside 2ms budget for 200 log writes', async () => {
    const log = createLogger('perf-test');
    const { ms } = await measure(
      'log.burst',
      () => {
        for (let i = 0; i < 200; i += 1) log.debug('tick', { i });
      },
      8,
    );
    assertBudget('log.burst', ms, 12);
  });

  it('creates prefixed ids', () => {
    expect(createId('gen').startsWith('gen_')).toBe(true);
  });
});
