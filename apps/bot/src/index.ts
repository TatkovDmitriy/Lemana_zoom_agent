import { Bot } from 'grammy';
import { config } from './config.js';
import { whitelist } from './middleware/whitelist.js';
import { startCommand } from './commands/start.js';
import { projectsCommand } from './commands/projects.js';
import { lastCommand } from './commands/last.js';
import { searchCommand } from './commands/search.js';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Global whitelist — all handlers below this only run for allowed users
bot.use(whitelist());

bot.command('start', startCommand);
bot.command('projects', projectsCommand);
bot.command('last', lastCommand);
bot.command('search', searchCommand);

async function main() {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Привязать аккаунт' },
    { command: 'projects', description: 'Список проектов' },
    { command: 'last', description: 'Последняя минутка' },
    { command: 'search', description: 'Поиск по минуткам' },
  ]);

  console.log('[bot] Starting @LemanaZoomBot…');
  bot.start({
    onStart: (info) => console.log(`[bot] Running as @${info.username}`),
  });

  process.on('SIGTERM', () => {
    console.log('[bot] SIGTERM received, stopping…');
    void bot.stop();
  });
}

main().catch((err) => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
