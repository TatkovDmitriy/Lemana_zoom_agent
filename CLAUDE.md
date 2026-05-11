# Lemana Zoom Agent — Project Context for Claude Agents

## What is this project?

Lemana Zoom Agent — autonomous system that:
- Connects to corporate Zoom calls via MCP
- Generates structured meeting minutes (summaries) via Claude API
- Stores minutes in a web catalog (Next.js + Firebase) organized by project
- Sends minutes to Telegram bot (@LemanaZoomBot)
- Syncs minutes to Obsidian repository via GitHub API

## Infrastructure

| Component | Technology |
|---|---|
| Repo | https://github.com/TatkovDmitriy/Lemana_zoom_agent |
| Obsidian sync | https://github.com/TatkovDmitriy/Obsidian |
| Web hosting | Vercel (connected to GitHub) |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google SSO) |
| Worker | Long-running service (Railway / Fly.io / Render) |
| Telegram | @LemanaZoomBot |
| Secrets | .env.local (NEVER in repo or chat) |

## Monorepo Structure

```
/apps/web         — Next.js (Vercel)
/apps/watcher     — Zoom worker + Summarizer
/apps/bot         — Telegram bot
/packages/shared  — shared types, zod schemas, utilities
```

## Agent Roles & Team Structure

### My Role: PM (Product Manager)
I am the **PM agent**. My responsibilities:
- Manage backlog, decompose features, make product decisions
- Write task prompts for Dev and QA agents and pass them to the user
- I do NOT implement code or run deployments myself
- All implementation decisions go through Dev_agent_zoom_bot
- All deploy/test decisions go through QA_agent_zoom_bot

### Team Agents

| Agent | Responsibility |
|---|---|
| **PM** (this agent) | Backlog, task decomposition, product decisions, writing prompts for Dev & QA |
| **Dev_agent_zoom_bot** | All backend and frontend development (code, PRs, architecture) |
| **QA_agent_zoom_bot** | Deploy, testing, debugging, integration verification |

### Workflow
1. PM writes a task prompt (clear, self-contained brief)
2. PM passes the prompt to the user
3. User feeds the prompt to the relevant agent (Dev or QA)
4. Agent implements/tests and reports back
5. PM updates backlog and plans next task

## Development Branch

All work goes to `claude/setup-lemana-pm-rNWI3`.

## Key Files

- `docs/backlog.md` — current task backlog
- `docs/adr/` — Architecture Decision Records
- `docs/tasks/` — task briefs for Engineer and QA

## Environment Variables (never commit)

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=

# Zoom
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_WEBHOOK_SECRET_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=

# Anthropic
ANTHROPIC_API_KEY=

# GitHub (Obsidian sync)
GITHUB_TOKEN=
GITHUB_OBSIDIAN_REPO=TatkovDmitriy/Obsidian

# App
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Phase Roadmap

### Phase 1 — Core (current focus)
- Zoom webhook → transcript → minutes → Firestore
- Telegram push after each meeting
- Basic web catalog: projects + minutes list

### Phase 2 — Improvements
- Search across minutes
- Editing and tags
- Obsidian sync
- Auto-join via MCP (if feasible)

### Phase 3 — Autonomy
- Worker monitoring (uptime alerts)
- Multi-user mode
- Calendar integration (auto-detect meetings)

## Coding Standards

- TypeScript everywhere (strict mode)
- Zod for all data validation at system boundaries
- No inline secrets, no hardcoded IDs
- Shared types live in `/packages/shared`
- Each app has its own `package.json` and `.env.example`
