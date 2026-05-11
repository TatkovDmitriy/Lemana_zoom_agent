import { z } from 'zod';

const ConfigSchema = z.object({
  // Firebase — optional at startup so the HTTP server can bind even without
  // credentials (e.g. health-check-only deploys). Validated at usage time
  // inside firestore/client.ts.
  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().default(''),

  // faster-whisper (self-hosted) — no external API key required.
  WHISPER_MODEL: z.string().default('large-v3'),
  WHISPER_DEVICE: z.enum(['cpu', 'cuda', 'auto']).default('cpu'),
  WHISPER_COMPUTE_TYPE: z.string().default('int8'),
  WHISPER_LANGUAGE: z.string().default('ru'),
  WHISPER_SCRIPT: z.string().default('/app/transcribe.py'),

  ZOOM_SDK_KEY: z.string().default(''),
  ZOOM_SDK_SECRET: z.string().default(''),
  ZOOM_BOT_NAME: z.string().default('Lemana AI'),
  ZOOM_SDK_BINARY: z.string().default('/app/zoom-sdk/zoommtg'),

  // .catch('mock') treats invalid/empty values as 'mock' instead of crashing.
  BOT_MODE: z.enum(['mock', 'real']).catch('mock').default('mock'),

  PORT: z.coerce.number().int().default(4001),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing or invalid env vars: ${missing}`);
  }
  return result.data;
}

export const config = loadConfig();
