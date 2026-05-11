import Fastify from 'fastify';
import type { DocumentData } from 'firebase-admin/firestore';
import type { Job } from '@lemana/shared';
import { db } from './firestore/client.js';
import { processJoinMeeting } from './pipeline.js';
import { config } from './config.js';

const app = Fastify({ logger: { level: 'info' } });

app.get('/health', async () => ({
  ok: true,
  mode: config.BOT_MODE,
  ts: new Date().toISOString(),
}));

const inFlight = new Set<string>();

function startJobListener() {
  console.log(`[zoom-bot] listening for join_meeting jobs (mode=${config.BOT_MODE})…`);

  return db
    .collection('jobs')
    .where('status', '==', 'pending')
    .where('type', '==', 'join_meeting')
    .onSnapshot((snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const job = { id: change.doc.id, ...change.doc.data() } as Job & DocumentData;
        if (job.type !== 'join_meeting') continue;
        if (inFlight.has(job.id)) continue;

        inFlight.add(job.id);
        processJoinMeeting(job.id, job.payload)
          .catch((err: unknown) => {
            console.error('[zoom-bot] unhandled pipeline error:', err);
          })
          .finally(() => inFlight.delete(job.id));
      }
    });
}

async function main() {
  const unsubscribe = startJobListener();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`[zoom-bot] HTTP listening on :${config.PORT}`);

  process.on('SIGTERM', async () => {
    console.log('[zoom-bot] SIGTERM received, shutting down…');
    unsubscribe();
    await app.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[zoom-bot] fatal startup error:', err);
  process.exit(1);
});
