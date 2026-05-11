import { z } from 'zod';

const ConfigSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),

  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OBSIDIAN_REPO: z.string().default('TatkovDmitriy/Obsidian'),
  GITHUB_OBSIDIAN_BRANCH: z.string().default('main'),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_ALLOWED_USER_IDS: z.string().default(''),

  ENCRYPTION_KEY: z.string().min(1),

  WEB_APP_BASE_URL: z.string().url().default('http://localhost:3000'),

  PORT: z.coerce.number().int().default(4000),
  ZOOM_USE_MOCK: z.string().transform((v) => v === 'true').default('false'),
  ZOOM_ACCOUNT_ID: z.string().default(''),
  ZOOM_CLIENT_ID: z.string().default(''),
  ZOOM_CLIENT_SECRET: z.string().default(''),
  ZOOM_WEBHOOK_SECRET_TOKEN: z.string().default(''),
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

export const allowedTelegramIds = config.TELEGRAM_ALLOWED_USER_IDS
  ? config.TELEGRAM_ALLOWED_USER_IDS.split(',').map((id) => Number(id.trim())).filter(Boolean)
  : [];
