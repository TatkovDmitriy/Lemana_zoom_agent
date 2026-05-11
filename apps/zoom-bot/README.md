# @lemana/zoom-bot

Autonomous Zoom meeting bot. Listens for `join_meeting` jobs in Firestore,
joins the meeting via the Zoom Linux Meeting SDK, captures audio with FFmpeg
from a virtual PulseAudio sink, transcribes with Whisper, then emits a
`process_recording` job for the existing watcher pipeline.

## Modes

The bot ships with two modes selected by `BOT_MODE`:

| Mode   | Behaviour                                                                              |
| ------ | -------------------------------------------------------------------------------------- |
| `mock` | Simulates a 30-second meeting, writes a placeholder transcript, runs the full pipeline. Use this to verify the end-to-end flow without onboarding the Zoom SDK. |
| `real` | Spawns the Zoom Linux Meeting SDK binary at `ZOOM_SDK_BINARY`, captures audio via FFmpeg + PulseAudio, sends the recording to Whisper. **Requires the SDK to be installed manually — see below.** |

Default: `mock`.

## Local dev (mock mode)

```bash
pnpm --filter @lemana/zoom-bot dev
```

Insert a job manually:

```ts
await db.collection('jobs').add({
  type: 'join_meeting',
  status: 'pending',
  payload: {
    meetingUrl: 'https://zoom.us/j/123456789',
    ownerId: '<your-uid>',
  },
  attempts: 0,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});
```

Or post to the web API:

```bash
curl -X POST https://<host>/api/bot/join \
  -H "Authorization: Bearer <id-token>" \
  -H "Content-Type: application/json" \
  -d '{"meetingUrl":"https://zoom.us/j/123456789"}'
```

## Real mode — installing the Zoom Linux Meeting SDK

The Zoom Linux Meeting SDK is not redistributable, so it is **not** committed
to this repo. To enable `BOT_MODE=real`:

1. Sign in to the [Zoom Marketplace](https://marketplace.zoom.us) and create a
   **Meeting SDK** app (separate from any Server-to-Server OAuth app).
2. Note the **SDK Key** and **SDK Secret** — set them as `ZOOM_SDK_KEY` and
   `ZOOM_SDK_SECRET` in Railway env vars.
3. Download the Linux Meeting SDK from
   <https://developers.zoom.us/docs/meeting-sdk/linux/>.
4. Extract and place the binary entrypoint at the path referenced by
   `ZOOM_SDK_BINARY` (default `/app/zoom-sdk/zoommtg`). The Dockerfile creates
   an empty `/app/zoom-sdk/` directory; mount the SDK as a volume or extend
   the Dockerfile with `COPY zoom-sdk/ /app/zoom-sdk/` if you have permission
   to ship the binary in your own private build.
5. Update `src/bot.ts` (`runReal`) so the `spawn(...)` argv matches the
   actual CLI exposed by the SDK build you downloaded. The current call
   passes `--meeting-id / --password / --display-name / --sdk-key /
   --sdk-secret / --meeting-url`; the official sample CLI uses different
   flags depending on version.

> ⚠️ The Zoom Meeting SDK terms of service should be reviewed before running
> bots in production meetings — most plans require participant consent.

## Architecture

```
POST /api/bot/join                    ← web (apps/web)
        │
        ▼
Firestore  jobs { type: 'join_meeting', status: 'pending', payload: {...} }
        │
        ▼
@lemana/zoom-bot  (this service)
   ├── Xvfb         :99            virtual display
   ├── PulseAudio   virt_sink      virtual audio sink
   ├── Zoom SDK     (real mode)    joins meeting
   └── FFmpeg       capture        → /tmp/zoom-bot-<jobId>-<meetingId>.mp3
        │
        ▼
Whisper API  /v1/audio/transcriptions  → transcript (ru)
        │
        ▼
Firestore  jobs { type: 'process_recording', payload: { transcript, ... } }
        │
        ▼
@lemana/watcher  ← existing Claude → minutes → Firestore → Obsidian → Telegram
```

## Environment

See `.env.example`. All variables are validated by `zod` at startup; the
process exits with a clear error if any are missing.

## Deploying to Railway

Service config:

- **Dockerfile path**: `apps/zoom-bot/Dockerfile`
- **Build context**: repo root
- **Port**: `4001` (for the `/health` endpoint)
- **Env vars**: every key from `.env.example`

In `mock` mode the service is safe to run without the Zoom SDK present; in
`real` mode you must complete the SDK installation steps above before
deploying or the bot will refuse to start a meeting.
