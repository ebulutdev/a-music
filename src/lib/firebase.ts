import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import type { FirestoreLike } from '../../database/migrate-to-firebase';
import { pushLocalCacheToFirebase } from '../../database/migrate-to-firebase';
import { createLogger } from '../../agents/shared/logger';

const log = createLogger('firebase-client');

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDivszrGaHQs00tVC0cyjNUKh8wr-F2i8E',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'aimusic-1f868.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'aimusic-1f868',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'aimusic-1f868.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '359531727655',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:359531727655:web:9dabdd46c9098b9d393702',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-6S81W0CFX4',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.projectId !== '');
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let analyticsInstance: Analytics | null = null;

if (isFirebaseConfigured()) {
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    storageInstance = getStorage(appInstance);

    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && appInstance) {
          analyticsInstance = getAnalytics(appInstance);
          log.info('firebase.analytics.ready');
        }
      }).catch((err) => {
        log.warn('firebase.analytics.unsupported', { error: String(err) });
      });
    }

    log.info('firebase.init.success', { projectId: firebaseConfig.projectId });
  } catch (error) {
    log.error('firebase.init.failed', { error: String(error) });
  }
} else {
  log.warn('firebase.init.skipped', { reason: 'No apiKey or projectId configured' });
}

export const app = appInstance;
export const db = firestoreInstance;
export const auth = authInstance;
export const storage = storageInstance;
export const analytics = analyticsInstance;

/**
 * Adapter matching FirestoreLike interface for database migrations.
 */
export const firestoreAdapter: FirestoreLike = {
  set: async (collectionName: string, id: string, data: Record<string, unknown>) => {
    if (!db) {
      log.warn('firestoreAdapter.no_db', { collectionName, id });
      return;
    }
    const cleanData = JSON.parse(JSON.stringify(data));
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, cleanData, { merge: true });
  },
};

/**
 * Upload an audio Blob to Firebase Storage and return its public download URL.
 */
export async function uploadAudioToStorage(
  audioBlob: Blob,
  destinationPath: string
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized.');
  }
  const storageRef = ref(storage, destinationPath);
  const snapshot = await uploadBytes(storageRef, audioBlob, {
    contentType: audioBlob.type || 'audio/webm',
  });
  const downloadUrl = await getDownloadURL(snapshot.ref);
  log.info('storage.upload.success', { destinationPath, downloadUrl });
  return downloadUrl;
}

/**
 * Pushes the full local storage cache (users, songs, voice_profiles, etc.) to Firestore.
 */
export async function syncLocalDatabaseToFirestore(): Promise<{
  success: boolean;
  collections: string[];
  written: number;
  error?: string;
}> {
  if (!db) {
    return {
      success: false,
      collections: [],
      written: 0,
      error: 'Firestore is not initialized. Check your Firebase credentials.',
    };
  }
  try {
    const result = await pushLocalCacheToFirebase(firestoreAdapter);
    log.info('firebase.sync.complete', result);
    return {
      success: true,
      collections: result.collections,
      written: result.written,
    };
  } catch (err) {
    log.error('firebase.sync.error', { error: String(err) });
    return {
      success: false,
      collections: [],
      written: 0,
      error: String(err),
    };
  }
}
