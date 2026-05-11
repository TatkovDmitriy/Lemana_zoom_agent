import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { config } from '../config.js';

// Lazy init — Firebase is only connected when first used, so the process
// can start (and serve /health) even without credentials in mock-only setups.
let _db: Firestore | null = null;

function initDb(): Firestore {
  if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_ADMIN_CLIENT_EMAIL || !config.FIREBASE_ADMIN_PRIVATE_KEY) {
    throw new Error(
      'Firebase credentials are not configured. Set FIREBASE_PROJECT_ID, ' +
      'FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY environment variables.',
    );
  }
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: config.FIREBASE_PROJECT_ID,
        clientEmail: config.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: config.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: config.FIREBASE_PROJECT_ID,
    });
  }
  const firestore = getFirestore();
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}

export function getDb(): Firestore {
  if (!_db) _db = initDb();
  return _db;
}
