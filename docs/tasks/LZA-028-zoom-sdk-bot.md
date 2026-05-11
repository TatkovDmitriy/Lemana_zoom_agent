# LZA-028 — Zoom SDK Bot: автономная запись и транскрипция встреч

- **Дата**: 2026-05-11
- **Статус**: TODO
- **Приоритет**: P1
- **Компонент**: apps/zoom-bot (новый сервис)
- **Исполнитель**: Dev_agent_zoom_bot
- **Оценка**: ~3 недели

---

## Цель

Создать автономного бота который подключается к любой Zoom встрече по ссылке, записывает аудио, транскрибирует и передаёт транскрипт в существующий пайплайн (Claude → минутки → Firestore).

Пользователь вставляет ссылку `zoom.us/j/123456789` → бот заходит → после встречи минутка появляется в Inbox.

---

## Архитектура

```
Web UI (форма с Zoom-ссылкой)
    ↓
POST /api/bot/join { meetingUrl, projectId? }
    ↓
Firestore: jobs { type: 'join_meeting', meetingUrl, status: 'pending' }
    ↓
apps/zoom-bot (новый Docker-сервис на Railway)
    ├── Xvfb          — виртуальный дисплей
    ├── PulseAudio    — виртуальное аудио
    ├── Zoom Linux SDK — подключение к встрече
    ├── FFmpeg        — захват аудио в WAV/MP3
    └── Whisper API   — транскрипция аудио → текст
    ↓
Передать транскрипт в существующий watcher pipeline
(processRecording → Claude → минутки → Firestore)
```

---

## Новый сервис: apps/zoom-bot

### Структура

```
apps/zoom-bot/
  src/
    index.ts          — entry point, Firestore listener на join_meeting jobs
    bot.ts            — логика запуска Zoom SDK + аудио захвата
    transcribe.ts     — Whisper API интеграция
    pipeline.ts       — передача в watcher (или прямой вызов Claude)
    config.ts         — env vars validation (zod)
  Dockerfile          — Ubuntu + Xvfb + PulseAudio + Zoom SDK + FFmpeg
  package.json
```

### Dockerfile (ключевые слои)

```dockerfile
FROM ubuntu:22.04

# System deps
RUN apt-get update && apt-get install -y \
    xvfb pulseaudio ffmpeg wget curl \
    libglib2.0-0 libx11-6 libxcb1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Zoom Linux Meeting SDK
# Скачать с https://developers.zoom.us/docs/meeting-sdk/linux/
COPY zoom-sdk/ /app/zoom-sdk/

# Node.js + pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

WORKDIR /app
COPY ... (monorepo setup как в watcher/Dockerfile)

CMD ["./start.sh"]
```

### start.sh

```bash
#!/bin/bash
# Запускаем виртуальный дисплей
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99

# Запускаем виртуальное аудио
pulseaudio --start --log-target=file:/tmp/pulse.log

# Запускаем бота
node dist/index.js
```

### config.ts (env vars)

```typescript
const ConfigSchema = z.object({
  ZOOM_SDK_KEY: z.string(),           // Zoom Meeting SDK Key
  ZOOM_SDK_SECRET: z.string(),        // Zoom Meeting SDK Secret
  ZOOM_BOT_NAME: z.string().default('Lemana AI'),
  OPENAI_API_KEY: z.string(),         // для Whisper API
  ANTHROPIC_API_KEY: z.string(),      // для Claude (минутки)
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string(),
  PORT: z.coerce.number().default(4001),
});
```

---

## Zoom SDK интеграция (bot.ts)

Zoom Linux Meeting SDK предоставляет Node.js биндинги. Основные методы:

```typescript
import ZoomSDK from '@zoom/meetingsdk-linux';

export async function joinMeeting(meetingUrl: string, password?: string) {
  const sdk = new ZoomSDK.ZoomSDKManager();
  
  // Инициализация с SDK credentials
  await sdk.init({
    domain: 'zoom.us',
    appKey: config.ZOOM_SDK_KEY,
    appSecret: config.ZOOM_SDK_SECRET,
  });

  // Парсим meeting ID из URL
  const meetingId = extractMeetingId(meetingUrl); // zoom.us/j/123456789
  
  // Заходим на встречу как participant (без логина)
  await sdk.join({
    meetingNumber: meetingId,
    userName: config.ZOOM_BOT_NAME,
    password: password ?? '',
    role: 0, // 0 = participant, 1 = host
  });

  // Начинаем запись аудио через PulseAudio → FFmpeg
  const audioFile = await startAudioCapture(meetingId);
  
  // Слушаем событие окончания встречи
  sdk.on('meetingEnded', async () => {
    await stopAudioCapture();
    const transcript = await transcribeAudio(audioFile);
    await processTranscript(transcript, meetingUrl);
  });
}
```

### Аудио захват через FFmpeg

```typescript
import { spawn } from 'child_process';

function startAudioCapture(meetingId: string): Promise<string> {
  const outputFile = `/tmp/meeting-${meetingId}.mp3`;
  
  // Захватываем аудио с виртуального PulseAudio sink
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'pulse',           // PulseAudio input
    '-i', 'default',         // дефолтный audio sink
    '-acodec', 'mp3',
    '-ar', '16000',          // 16kHz — оптимально для Whisper
    outputFile
  ]);
  
  return outputFile;
}
```

---

## Whisper транскрипция (transcribe.ts)

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  const audioFile = fs.createReadStream(audioFilePath);
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ru',          // русский язык
    response_format: 'text',
  });
  
  // Cleanup
  fs.unlinkSync(audioFilePath);
  
  return transcription;
}
```

**Стоимость Whisper:** $0.006/мин = ~$0.36 за час встречи (очень дёшево).

---

## Web UI — форма отправки ссылки

Новая страница `/join` или кнопка на `/inbox`:

```tsx
// components/JoinMeetingForm.tsx
export function JoinMeetingForm() {
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/bot/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingUrl: url, password }),
    });
    toast.success('Бот отправлен на встречу!');
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input placeholder="https://zoom.us/j/123456789" value={url} onChange={...} />
      <Input placeholder="Пароль встречи (если есть)" value={password} onChange={...} />
      <Button type="submit">Подключить бота</Button>
    </form>
  );
}
```

### API endpoint

```typescript
// app/api/bot/join/route.ts
export const POST = withAuth(async (req, uid) => {
  const { meetingUrl, password } = await req.json();
  
  await adminDb.collection('jobs').add({
    type: 'join_meeting',
    status: 'pending',
    payload: { meetingUrl, password: password ?? null, ownerId: uid },
    attempts: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  return NextResponse.json({ ok: true });
});
```

---

## Необходимые Zoom SDK credentials

1. Зайти на [marketplace.zoom.us](https://marketplace.zoom.us)
2. Build App → **Meeting SDK** (не OAuth app)
3. Получить **SDK Key** и **SDK Secret**
4. Добавить в Railway env vars:
   - `ZOOM_SDK_KEY`
   - `ZOOM_SDK_SECRET`

> ⚠️ Meeting SDK credentials — отдельно от Server-to-Server OAuth который уже используется для webhook.

---

## Railway деплой

Отдельный сервис в Railway:
- **Dockerfile**: `apps/zoom-bot/Dockerfile`
- **Build context**: корень репо
- **Env vars**: все из config.ts

---

## Критерии готовности (DoD)

- [ ] Бот заходит на тестовую Zoom встречу по ссылке
- [ ] Аудио корректно захватывается (нет тишины в файле)
- [ ] Whisper возвращает читаемый транскрипт на русском
- [ ] После окончания встречи минутка появляется в Inbox на сайте
- [ ] `docker build` проходит без ошибок
- [ ] Логи Railway чистые в нормальном сценарии
- [ ] Бот корректно завершается по SIGTERM

---

## Зависимости

- LZA-027 (Inbox) должна быть закрыта — минутки должны уметь сохраняться без projectId
- Zoom Meeting SDK лицензия: проверить terms of use для server-side ботов

---

## Примечания

- Бот виден участникам встречи под именем "Lemana AI" — это нормально
- Если хост запрещает запись — бот всё равно присутствует и захватывает аудио через PulseAudio (локально, не через Zoom Cloud)
- Zoom SDK для Linux в бета-статусе — возможны нестабильности, нужно тестировать
