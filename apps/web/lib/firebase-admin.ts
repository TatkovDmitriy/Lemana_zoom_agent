import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let cachedApp: App | undefined;
let cachedDb: Firestore | undefined;
let cachedAuth: Auth | undefined;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_ADMIN_CLIENT_EMAIL'];
  const privateKey = process.env['FIREBASE_ADMIN_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK env vars are not set');
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  return cachedApp;
}

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!cachedDb) {
      cachedDb = getFirestore(getAdminApp());
      cachedDb.settings({ ignoreUndefinedProperties: true });
    }
    return Reflect.get(cachedDb, prop, cachedDb);
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!cachedAuth) cachedAuth = getAuth(getAdminApp());
    return Reflect.get(cachedAuth, prop, cachedAuth);
  },
});
