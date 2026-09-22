import { FIREBASE_COLLECTIONS } from '../../database/firebase-collections';
import { createId } from './ids';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'perf';

export type LogEntry = {
  id: string;
  scope: string;
  level: LogLevel;
  event: string;
  data: Record<string, unknown>;
  createdAt: number;
};

const RING_MAX = 400;
const ring: LogEntry[] = [];
const listeners = new Set<(entry: LogEntry) => void>();

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  perf: 25,
};

function threshold(): number {
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') return RANK.debug;
  return RANK.debug;
}

export function getLogBuffer(): readonly LogEntry[] {
  return ring;
}

export function clearLogBuffer(): void {
  ring.length = 0;
}

export function onLog(fn: (entry: LogEntry) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persistHint(entry: LogEntry): Record<string, unknown> {
  return {
    collection: FIREBASE_COLLECTIONS.agent_logs.name,
    id: entry.id,
    scope: entry.scope,
    level: entry.level,
    event: entry.event,
    data: entry.data,
    createdAt: entry.createdAt,
  };
}

function write(scope: string, level: LogLevel, event: string, data: Record<string, unknown> = {}): LogEntry {
  const entry: LogEntry = {
    id: createId('log'),
    scope,
    level,
    event,
    data,
    createdAt: Date.now(),
  };

  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();

  if (RANK[level] >= threshold()) {
    const line = `[${scope}] ${level.toUpperCase()} ${event}`;
    if (level === 'error') console.error(line, data);
    else if (level === 'warn') console.warn(line, data);
    else if (level === 'perf') console.info(line, data);
    else console.info(line, data);
  }

  for (const fn of listeners) fn(entry);
  return entry;
}

export function createLogger(scope: string) {
  return {
    scope,
    collection: FIREBASE_COLLECTIONS.agent_logs.name,
    debug: (event: string, data?: Record<string, unknown>) => write(scope, 'debug', event, data),
    info: (event: string, data?: Record<string, unknown>) => write(scope, 'info', event, data),
    warn: (event: string, data?: Record<string, unknown>) => write(scope, 'warn', event, data),
    error: (event: string, data?: Record<string, unknown>) => write(scope, 'error', event, data),
    perf: (event: string, data?: Record<string, unknown>) => write(scope, 'perf', event, data),
    persistHint,
  };
}

export function logsFor(scope: string): LogEntry[] {
  return ring.filter((e) => e.scope === scope);
}
