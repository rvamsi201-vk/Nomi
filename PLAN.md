# Nomi — Simple Plan (v2)

**One app. One database. No Mattermost. No PostgreSQL. No Docker.**

---

## What Nomi is

A single internal tool for your team (1–10 people):

| Feature | How |
|---------|-----|
| **Public channels** | Built-in chat rooms (`#general`, `#engineering`) |
| **DMs** | 1:1 messages between employees |
| **Projects** | Simple project list with description |
| **Tasks** | Kanban board per project |

Everything lives in **one codebase** and **one SQLite file**.

---

## Stack (minimal)

```
Next.js app  →  SQLite (nomi.db)  →  npm run dev
```

| Piece | Choice | Why |
|-------|--------|-----|
| App | Next.js | UI + API in one project |
| Database | **SQLite only** | One file, zero setup, perfect for 1–10 users |
| Realtime chat | Polling first (upgrade to WebSockets later) | Simplest to build |
| Auth | Email + password | No OAuth setup needed for v1 |
| Deploy | `npm run build && npm start` on one small server | No extra services |

**Not using:** Mattermost, MySQL, PostgreSQL, Redis, Docker.

---

## How it looks

```
┌─────────────────────────────────────────────────────┐
│  NOMI                                               │
├──────────────┬──────────────────────────────────────┤
│  # general   │  Messages in #general                │
│  # random    │                                      │
│  ─────────   │  [Type a message...]        [Send]   │
│  DMs         │                                      │
│  · Alex      │                                      │
│  · Sam       │                                      │
│  ─────────   │                                      │
│  Projects    │                                      │
│  Tasks       │                                      │
└──────────────┴──────────────────────────────────────┘
```

Three areas, one sidebar. No iframe, no second server.

---

## Database (SQLite — 5 tables)

```
User          → id, name, email, password
Channel       → id, name, type (public | dm)
ChannelMember → channelId, userId
Message       → id, channelId, userId, text, createdAt
Project       → id, name, description
Task          → id, projectId, title, status, assigneeId
```

That's it. No sync, no bot tokens, no external IDs.

---

## Build in 3 sprints (not 3 months)

### Sprint 1 — Chat ✅
- [x] Login / register
- [x] Create `#general` channel
- [x] Send & read messages (3s polling)
- [x] List public channels
- [x] Create new public channels

### Sprint 2 — DMs + Projects ✅
- [x] Start a DM with any teammate
- [x] Create / view projects
- [x] Link a project to a channel (`#proj-name`)

### Sprint 3 — Tasks ✅
- [x] Kanban board per project
- [x] Assign tasks, move status
- [x] Task list view
- [x] Task updates post to project channel

**Total: ~1–2 weeks part-time** for a team of 1–3 engineers.

---

## Daily usage

```bash
npm install
npm run dev
```

Open http://localhost:3001. Done.

No `~/nomi-services`, no Mattermost, no `start.sh`, no bot tokens.

---

## Deploy (when ready)

One small VPS (2 GB RAM):

```bash
npm run build
npm start          # or pm2 start npm -- start
```

Copy `data/nomi.db` for backups. That's the entire database.

---

## What we dropped (on purpose)

| Removed | Why |
|---------|-----|
| Mattermost | Second server, PostgreSQL, bot setup, iframe issues |
| PostgreSQL / MySQL | SQLite is enough for 1–10 users |
| Docker | Native Node is simpler |
| Mattermost sync | No external system to keep in sync |

---

## Next step

Say **"build Sprint 1"** and we scaffold a clean Nomi repo:

1. Next.js + SQLite + login
2. `#general` channel with messaging
3. Nomi branding

One command to run. No external services.
