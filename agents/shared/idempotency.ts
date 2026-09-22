type IdempotentEntry = {
  recordId: string;
  timestamp: number;
};

const idempotencyStore = new Map<string, IdempotentEntry>();

export function resetIdempotencyStore(): void {
  idempotencyStore.clear();
}

/**
 * Computes a unique deterministic fingerprint for a generation request.
 */
export function computeRequestFingerprint(params: {
  userId: string;
  kind: string;
  prompt: string;
  title?: string;
  style?: string;
  lyrics?: string;
}): string {
  const norm = [
    params.userId,
    params.kind,
    params.prompt.trim().toLowerCase(),
    (params.title || '').trim().toLowerCase(),
    (params.style || '').trim().toLowerCase(),
    (params.lyrics || '').trim().toLowerCase(),
  ].join('|');

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < norm.length; i += 1) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Checks if a request with this idempotency key was already submitted within ttlMs.
 * Returns existing record ID if duplicate, or records it if new.
 */
export function processIdempotency(
  key: string,
  newRecordId: string,
  ttlMs = 15_000,
): { isDuplicate: boolean; recordId: string } {
  const now = Date.now();
  const existing = idempotencyStore.get(key);

  if (existing && now - existing.timestamp < ttlMs) {
    return { isDuplicate: true, recordId: existing.recordId };
  }

  idempotencyStore.set(key, { recordId: newRecordId, timestamp: now });
  return { isDuplicate: false, recordId: newRecordId };
}
