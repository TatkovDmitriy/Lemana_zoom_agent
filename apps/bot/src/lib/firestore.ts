import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config.js';

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

export const db = getFirestore();
