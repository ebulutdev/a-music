import { createLogger } from './logger';

const log = createLogger('perf');

export async function measure<T>(
  name: string,
  fn: () => T | Promise<T>,
  budgetMs: number,
): Promise<{ value: T; ms: number; withinBudget: boolean }> {
  const start = performance.now();
  const value = await fn();
  const ms = performance.now() - start;
  const withinBudget = ms <= budgetMs;
  log.perf(name, { ms: Number(ms.toFixed(3)), budgetMs, withinBudget });
  if (!withinBudget) {
    log.warn('budget.exceeded', { name, ms, budgetMs });
  }
  return { value, ms, withinBudget };
}

export function assertBudget(name: string, ms: number, budgetMs: number): void {
  if (ms > budgetMs) {
    throw new Error(`${name} took ${ms.toFixed(2)}ms > ${budgetMs}ms budget`);
  }
}

export function fpsFromFrameMs(frameMs: number): number {
  if (frameMs <= 0) return 0;
  return 1000 / frameMs;
}
