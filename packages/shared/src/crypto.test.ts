import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto.js';
import { randomBytes } from 'node:crypto';

describe('AES-256-GCM encrypt/decrypt', () => {
  const key = randomBytes(32).toString('base64');

  it('round-trips a short string', () => {
    const plaintext = 'hello zoom token';
    const payload = encrypt(plaintext, key);
    expect(decrypt(payload, key)).toBe(plaintext);
  });

  it('round-trips a long string', () => {
    const plaintext = 'x'.repeat(10_000);
    const payload = encrypt(plaintext, key);
    expect(decrypt(payload, key)).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const pt = 'same content';
    const a = encrypt(pt, key);
    const b = encrypt(pt, key);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it('throws with wrong key', () => {
    const wrongKey = randomBytes(32).toString('base64');
    const payload = encrypt('secret', key);
    expect(() => decrypt(payload, wrongKey)).toThrow();
  });
});
