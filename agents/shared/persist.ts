import { createLogger } from './logger';

const log = createLogger('persist');
const PREFIX = 'aimusic.col.';

const memory = new Map<string, Record<string, Record<string, unknown>>>();

function bucket(collection: string): Record<string, Record<string, unknown>> {
  const cached = memory.get(collection);
  if (cached) return cached;
  const empty: Record<string, Record<string, unknown>> = {};
  if (typeof localStorage === 'undefined') {
    memory.set(collection, empty);
    return empty;
  }
  try {
    const raw = localStorage.getItem(PREFIX + collection);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    memory.set(collection, parsed);
    return parsed;
  } catch (error) {
    log.error('persist.read-fail', { collection, message: String(error) });
    memory.set(collection, empty);
    return empty;
  }
}

function flush(collection: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + collection, JSON.stringify(bucket(collection)));
  } catch (error) {
    log.error('persist.write-fail', { collection, message: String(error) });
  }
}

export function upsertLocal(collection: string, record: Record<string, unknown>): void {
  const id = String(record.id ?? '');
  if (!id) throw new Error(`upsertLocal ${collection}: missing id`);
  const next = { ...record };
  bucket(collection)[id] = next;
  flush(collection);
  log.debug('persist.upsert', { collection, id });
}

export function readLocal<T extends Record<string, unknown>>(collection: string, id: string): T | null {
  const row = bucket(collection)[id];
  return (row as T) ?? null;
}

export function readAllLocal<T extends Record<string, unknown>>(collection: string): T[] {
  return Object.values(bucket(collection)) as T[];
}

export function removeLocal(collection: string, id: string): void {
  delete bucket(collection)[id];
  flush(collection);
  log.debug('persist.remove', { collection, id });
}

export function clearCollection(collection: string): void {
  memory.set(collection, {});
  if (typeof localStorage !== 'undefined') localStorage.removeItem(PREFIX + collection);
}

export function resetAllLocal(): void {
  memory.clear();
  if (typeof localStorage === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}
