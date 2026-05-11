import Fastify from 'fastify';
import { db } from './firestore/client.js';
import { processRecording } from './pipeline.js';
import { config } from './config.js';
import type { Job } from '@lemana/shared';
import type { DocumentData } from 'firebase-admin/firestore';

const app = Fastify({ logger: { level: 'info' } });

app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

// Start Firestore job queue listener
function startJobListener() {
  console.log('[watcher] Starting Firestore job listener…');

  return db
    .collection('jobs')
    .where('status', '==', 'pending')
    .onSnapshot((snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const job = { id: change.doc.id, ...change.doc.data() } as Job & DocumentData;
        if (job.type !== 'process_recording') continue;

        processRecording(job.id, job.payload).catch((err: unknown) => {
          console.error('[watcher] unhandled pipeline error:', err);
        });
      }
    });
}

// If ZOOM_USE_MOCK=true, inject a test job on startup
async function injectMockJob() {
  if (!config.ZOOM_USE_MOCK) return;
  const { createMockJobPayload } = await import('./zoom/mock.js');
  const { Timestamp } = await import('firebase-admin/firestore');
  console.log('[watcher] Injecting mock job…');
  await db.collection('jobs').add({
    ...createMockJobPayload(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

async function main() {
  const unsubscribe = startJobListener();

  await injectMockJob();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`[watcher] HTTP listening on :${config.PORT}`);

  process.on('SIGTERM', async () => {
    console.log('[watcher] SIGTERM received, shutting down…');
    unsubscribe();
    await app.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[watcher] Fatal startup error:', err);
  process.exit(1);
});
