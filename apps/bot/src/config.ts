import { z } from 'zod';

const ConfigSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_ALLOWED_USER_IDS: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  WEB_APP_BASE_URL: z.string().url().default('http://localhost:3000'),
});

const result = ConfigSchema.safeParse(process.env);
if (!result.success) {
  const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Bot missing env vars: ${missing}`);
}

export const config = result.data;

export const allowedIds: Set<number> = new Set(
  config.TELEGRAM_ALLOWED_USER_IDS
    ? config.TELEGRAM_ALLOWED_USER_IDS.split(',')
        .map((s) => Number(s.trim()))
        .filter(Boolean)
    : [],
);
