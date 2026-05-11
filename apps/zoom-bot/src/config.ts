import { z } from 'zod';

const ConfigSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),

  ZOOM_SDK_KEY: z.string().default(''),
  ZOOM_SDK_SECRET: z.string().default(''),
  ZOOM_BOT_NAME: z.string().default('Lemana AI'),
  ZOOM_SDK_BINARY: z.string().default('/app/zoom-sdk/zoommtg'),

  BOT_MODE: z.enum(['mock', 'real']).default('mock'),

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
