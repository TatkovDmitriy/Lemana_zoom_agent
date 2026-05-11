'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedDb: Firestore | undefined;

function getClientApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }
  cachedApp = initializeApp({
    apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
    authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
    storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
  });
  return cachedApp;
}

export function getClientAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getClientApp());
  return cachedAuth;
}

export function getClientDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getClientApp());
  return cachedDb;
}
