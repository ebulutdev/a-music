import {
  FIREBASE_COLLECTIONS,
  FIREBASE_PROJECT_HINT,
  listFirebaseCollections,
} from './firebase-collections';
import { readAllLocal } from '../agents/shared/persist';
import { createLogger } from '../agents/shared/logger';

const log = createLogger('firebase-migrate');

export type FirestoreLike = {
  set: (collection: string, id: string, data: Record<string, unknown>) => Promise<void>;
};

/**
 * Call this after Firebase is initialized. It walks every registered
 * collection, reads the local cache (same document ids), and writes
 * them without renaming fields.
 */
export async function pushLocalCacheToFirebase(db: FirestoreLike): Promise<{
  collections: string[];
  written: number;
}> {
  const collections = listFirebaseCollections();
  let written = 0;

  log.info('migrate.start', {
    project: FIREBASE_PROJECT_HINT.suggestedProjectId,
    collections: collections.length,
  });

  for (const name of collections) {
    const rows = readAllLocal(name);
    log.debug('migrate.collection', { name, count: rows.length });
    for (const row of rows) {
      const id = String(row.id ?? '');
      if (!id) {
        log.warn('migrate.skip-missing-id', { name });
        continue;
      }
      await db.set(name, id, row);
      written += 1;
    }
  }

  log.info('migrate.done', { written, collections: collections.length });
  return { collections, written };
}

export function firebaseBootstrapChecklist(): string[] {
  return [
    `Create project ${FIREBASE_PROJECT_HINT.suggestedProjectId}`,
    `Enable Firestore in ${FIREBASE_PROJECT_HINT.firestoreLocation}`,
    `Enable Storage bucket ${FIREBASE_PROJECT_HINT.storageBucketHint}`,
    ...Object.values(FIREBASE_COLLECTIONS).map(
      (c) => `Create collection "${c.name}" — ${c.description}`,
    ),
    'Seed documents using FIREBASE_SEED_IDS from firebase-collections.ts',
    'Run pushLocalCacheToFirebase(firestoreAdapter)',
  ];
}
