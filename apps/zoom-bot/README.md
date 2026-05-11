# @lemana/zoom-bot

Autonomous Zoom meeting bot. Listens for `join_meeting` jobs in Firestore,
joins the meeting via the **Zoom Web Client** driven by Playwright (no Zoom
SDK or paid services required), captures audio with FFmpeg from a virtual
PulseAudio sink, transcribes locally with self-hosted
[faster-whisper](https://github.com/SYSTRAN/faster-whisper), then emits a
`process_recording` job for the existing watcher pipeline.

## Cost

| Step                       | Cost           |
| -------------------------- | -------------- |
| Transcription (faster-whisper) | **$0** (runs on the Railway container) |
| Browser session (Playwright)   | **$0** (bundled Chromium, no API)      |
| Minute generation (Claude)     | $0.10–0.20 / meeting |
| Railway service                | flat ~$5–10 / month |

No external transcription API, no Zoom SDK key. Everything runs inside the
container so cost does not scale with audio hours.

## Modes

`BOT_MODE` switches between two operational modes:

| Mode   | Behaviour |
| ------ | --------- |
| `mock` | Simulates a short meeting (≈5 s), writes a placeholder transcript marker, and runs the full downstream pipeline. Use this to verify end-to-end (form → Firestore job → bot → watcher → `/inbox`) without joining a real call. Playwright is **not** invoked in this mode. |
| `real` | Launches Chromium via Playwright at `https://zoom.us/wc/join/<id>`, fills name + password, joins the meeting, and records the page audio via PulseAudio + FFmpeg. After the meeting ends (host hang-up or `MEETING_TIMEOUT_MIN`), the recording is transcribed by faster-whisper and dispatched to the watcher. |

Default: `mock`.

## Architecture

```
POST /api/bot/join                              ← apps/web
        │
        ▼
Firestore  jobs { type: 'join_meeting', status: 'pending', payload: {…} }
        │
        ▼
@lemana/zoom-bot  (this service)
   ├── Xvfb            :99               virtual display
   ├── PulseAudio      virt_sink         virtual audio sink + monitor
   ├── Chromium        Playwright        joins zoom.us/wc/join/<id>
   └── FFmpeg          capture           → /tmp/zoom-bot-<jobId>-<id>.mp3
        │
        ▼
faster-whisper  (local Python, transcribe.py)
        │
        ▼
Firestore  jobs { type: 'process_recording', payload: { transcript, … } }
        │
        ▼
@lemana/watcher  ← existing Claude → minute (projectId=null → /inbox)
```

## faster-whisper

| Model      | RAM    | RU quality | 1h audio (CPU/int8) |
| ---------- | ------ | ---------- | ------------------- |
| `medium`   | ~2 GB  | Good       | ~3–5 min            |
| `large-v3` | ~4 GB  | Excellent  | ~8–10 min           |

Default model: `large-v3` (overridable via `WHISPER_MODEL`). The model is
downloaded at runtime on first transcription (or you can pre-warm it during
the Docker build by adding a `RUN python3 -c "WhisperModel(...)"` step).

> **Railway plan**: `large-v3` on CPU needs ~4 GB RAM. Pick a plan with
> ≥ 4 GB or override `WHISPER_MODEL=medium`.

## Local dev (mock mode)

```bash
pnpm --filter @lemana/zoom-bot dev
```

The Python stack is **not** invoked in mock mode, so faster-whisper does not
need to be installed locally. The bot writes a sentinel to a temp file and
`transcribe.ts` short-circuits to a canned transcript.

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

Or via the web API:

```bash
curl -X POST https://<host>/api/bot/join \
  -H "Authorization: Bearer <id-token>" \
  -H "Content-Type: application/json" \
  -d '{"meetingUrl":"https://zoom.us/j/123456789"}'
```

## Real mode — what to expect

1. Chromium launches against `DISPLAY=:99` (Xvfb).
2. Bot navigates to `https://zoom.us/wc/join/<meetingId>`.
3. Fills the name field with `BOT_NAME` (default `Lemana AI`).
4. Fills the password if provided in the URL (`?pwd=`) or in the job payload.
5. Clicks **Join** and dismisses the audio/video preview screens.
6. FFmpeg starts capturing from PulseAudio's `virt_sink.monitor`.
7. The bot polls the DOM for an "ended" indicator (or hits `MEETING_TIMEOUT_MIN`).
8. FFmpeg stops, audio is transcribed, a `process_recording` job is dispatched.

> Zoom's Web Client DOM changes occasionally. If selectors break, see
> `src/bot.ts` (`runReal`) — the locators use a permissive `placeholder/id/
> aria-label` combo, but may need updating.

## Environment

See `.env.example`. All variables are validated by `zod` at startup; the
process exits with a clear error if any required vars are missing.

| Var | Default | Notes |
|---|---|---|
| `BOT_MODE` | `mock` | `mock` ⇒ skip Playwright; `real` ⇒ join the call |
| `ZOOM_BOT_NAME` | `Lemana AI` | Name shown to other participants |
| `MEETING_TIMEOUT_MIN` | `120` | Hard upper bound on a single meeting |
| `WHISPER_MODEL` | `large-v3` | `medium` is a viable cheaper fallback |
| `WHISPER_DEVICE` | `cpu` | `cuda` requires a GPU runtime |
| `WHISPER_COMPUTE_TYPE` | `int8` | `float16` on GPU |
| `WHISPER_LANGUAGE` | `ru` | |
| `FIREBASE_PROJECT_ID` | — | Same Firebase project as web/watcher |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | — | |
| `FIREBASE_ADMIN_PRIVATE_KEY` | — | Newlines may be escaped as `\n` |
| `PORT` | `4001` | Healthcheck port |

`ANTHROPIC_API_KEY` is **not** needed here — Claude is called by the watcher
service on the `process_recording` jobs that this bot emits.

## Deploying to Railway

- **Build context**: `apps/zoom-bot` (Root Directory)
- **Dockerfile**: `apps/zoom-bot/Dockerfile`
- **Port**: `4001` (`/health` endpoint)
- **RAM**: ≥ 4 GB for `large-v3`
- **Env vars**: every key from `.env.example`

In `mock` mode the service is safe to run without any Zoom credentials —
useful as a smoke test of the full pipeline (LZA-QA-006).
