import { Timestamp } from 'firebase-admin/firestore';
import { db } from './client.js';
import { encrypt, decrypt } from '@lemana/shared';
import { config } from '../config.js';

export async function saveZoomTokens(
  accountEmail: string,
  refreshToken: string,
  accessToken?: string,
  expiresAt?: Date,
): Promise<void> {
  const encRefresh = encrypt(refreshToken, config.ENCRYPTION_KEY);
  const encAccess = accessToken ? encrypt(accessToken, config.ENCRYPTION_KEY) : null;

  await db.collection('zoom_tokens').doc(accountEmail).set({
    encryptedRefreshToken: encRefresh.ciphertext,
    refreshTokenIv: encRefresh.iv,
    refreshTokenAuthTag: encRefresh.authTag,
    encryptedAccessToken: encAccess?.ciphertext ?? null,
    accessTokenIv: encAccess?.iv ?? null,
    accessTokenAuthTag: encAccess?.authTag ?? null,
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    updatedAt: Timestamp.now(),
  });
}

export async function getZoomRefreshToken(accountEmail: string): Promise<string | null> {
  const doc = await db.collection('zoom_tokens').doc(accountEmail).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return decrypt(
    {
      ciphertext: d['encryptedRefreshToken'] as string,
      iv: d['refreshTokenIv'] as string,
      authTag: d['refreshTokenAuthTag'] as string,
    },
    config.ENCRYPTION_KEY,
  );
}
