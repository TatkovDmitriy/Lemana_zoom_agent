import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { config } from '../config.js';

let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (_db) return _db;

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

  _db = getFirestore();
  _db.settings({ ignoreUndefinedProperties: true });
  return _db;
}
