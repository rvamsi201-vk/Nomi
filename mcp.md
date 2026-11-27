# Nomi MCP + Nomira — what we built and how to use it

Nomi is the internal Exora workspace (projects / tasks / chat). **Nomira** is the AI teammate that can read and write that workspace through MCP tools and the in-app chat UI.

---

## What was implemented (beginning → end)

### 1. API token auth in Nomi
- Prisma model `ApiToken` (hashed Bearer tokens)
- Cookie sessions still work for the browser
- Agents / MCP use `Authorization: Bearer <token>`
- Admin routes: `GET/POST/DELETE /api/api-tokens`
- Files: `lib/api-token.ts`, `lib/auth.ts`, `app/api/api-tokens/`, migration `20261127120000_api_tokens`

### 2. Bot user **nomira**
- Display name `nomira`, email `nomi-bot@exora-solutions.local`, **admin**
- Script: `scripts/create-nomira-bot.ts` (`npm run bot:nomira`)
- Mints token `mcp-cli` into `/srv/apps/shared/mcp-nomi/.env`

### 3. MCP package (`mcp/` in this repo; runtime also under `/srv/apps/shared/mcp-nomi`)
- **stdio MCP** — Claude Code / Codex / Cursor on a machine: `node mcp/src/mcp-stdio.js`
- **HTTP MCP (Streamable HTTP)** — Claude.ai / Chrome remote connector: `https://nomi.exora.solutions/mcp`
- **CLI** — `nomi` (`mcp/src/cli.js`) for shell scripting
- Tools (full write as nomira): projects, tasks, channels/messages, DMs, team, unread, presence

### 4. In-app **Nomira AI** (all Nomi users)
- Sidebar → **Nomira AI** (`/nomira`)
- Host Docker service `nomira-agent` runs **Codex CLI** + nomi MCP (Claude login on the VPS was expired)
- Nomi API `POST /api/nomira/chat` → agent → tools → reply
- DM **nomira** also auto-replies
- **Chat history**: saved per user (`NomiraConversation` / `NomiraMessage`); **New chat** + history list; survives tab switches

### 5. Docker / gateway
| Service | Role |
|---------|------|
| `nomi` | Next.js app → `127.0.0.1:3002` → https://nomi.exora.solutions |
| `nomira-agent` | Codex agent on host network → `:3015` |
| `nomi-mcp` | Public Streamable HTTP MCP → `127.0.0.1:3016` |
| nginx | `/mcp` → `3016`; everything else → `3002` |

Remote Postgres stays on the other VPS via `DATABASE_URL` in `source/.env`.

---

## How to use it

### A) In the Nomi website (every teammate)
1. Open https://nomi.exora.solutions and sign in.
2. Sidebar → **Nomira AI**.
3. Ask e.g. “list projects”, “create a task on Infinitica…”, “post in #general…”.
4. Use **New chat** / **History** on the left; chats persist when you leave and return.
5. Or DM **nomira** from Direct messages.

### B) Claude.ai / Claude in Chrome (remote MCP)
1. Get the token on the server:  
   `grep MCP_AUTH_TOKEN /srv/apps/shared/mcp-nomi/.env`
2. Claude → **Settings → Connectors → Add custom connector → Web/Remote**
3. URL: `https://nomi.exora.solutions/mcp`
4. Request header: `Authorization` = `Bearer <token>`
5. Enable the connector and ask Claude to manage Nomi tasks/projects/chat.

### C) Claude Code or Codex on your laptop
```bash
cd mcp
npm ci
# .env:
# NOMI_BASE_URL=https://nomi.exora.solutions
# NOMI_API_TOKEN=nomi_…
```
Point MCP config at `node …/mcp/src/mcp-stdio.js` (see `mcp/README.md`).

### D) CLI on the VPS
```bash
nomi projects list
nomi tasks create --project <id> --title "…"
nomi chat post --channel <id> --text "…"
```

---

## Ops cheat sheet

```bash
# Redeploy stack
cd /srv/apps/nomi && docker compose up -d --build

# Recreate bot token
cd /srv/apps/nomi/source && set -a && . ./.env && set +a && npx tsx scripts/create-nomira-bot.ts

# Logs
docker logs -f nomi-mcp
docker logs -f nomira-agent
docker logs -f nomi
```

---

## Security notes
- Browser users keep normal email/password login.
- MCP / CLI / Nomira agent act as **nomira (admin)** via Bearer token — treat the token like a password.
- `/mcp` is public HTTPS but **requires** the Bearer token (401 without it).
