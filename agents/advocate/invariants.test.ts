import { describe, expect, it } from 'vitest';
import { firebaseBootstrapChecklist } from '../../database/migrate-to-firebase';
import { listFirebaseCollections } from '../../database/firebase-collections';
import { runAdvocate } from './invariants';

describe('devil advocate + firebase contract', () => {
  it('passes every invariant', () => {
    const findings = runAdvocate();
    const failed = findings.filter((f) => !f.ok);
    expect(failed).toEqual([]);
  });

  it('lists every collection that must be opened in firebase', () => {
    expect(listFirebaseCollections()).toContain('mashups');
    expect(listFirebaseCollections()).toContain('covers');
    expect(listFirebaseCollections()).toContain('settings');
    expect(firebaseBootstrapChecklist().some((line) => line.includes('voice_profiles'))).toBe(true);
  });
});
