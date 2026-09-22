export function createId(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw}`;
}

export function assertIdPrefix(id: string, prefix: string): void {
  if (!id.startsWith(`${prefix}_`)) {
    throw new Error(`id "${id}" must start with ${prefix}_`);
  }
}
