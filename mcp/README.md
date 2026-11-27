# mcp-nomi

stdio MCP server + `nomi` CLI for the internal Nomi workspace (Zoho Sprints + Teams style).

Acts as the dedicated bot user **nomira** via Bearer API token against `http://127.0.0.1:3002`.

## In-app Nomira (all users)

Docker Compose service `nomira-agent` (`network_mode: host`, port `3015`).
Nomi UI → **Nomira AI** (or DM **nomira**) → `/api/nomira/chat` → agent → Codex + nomi MCP.

```bash
cd /srv/apps/nomi && docker compose up -d --build nomira-agent
```

## Remote HTTPS MCP (Claude.ai / Chrome)

Public Streamable HTTP endpoint (Docker `nomi-mcp`):

- **URL:** `https://nomi.exora.solutions/mcp`
- **Auth header:** `Authorization: Bearer <MCP_AUTH_TOKEN>`
  (same value as `NOMI_API_TOKEN` / bot token in `.env`)

### Claude.ai / Claude Chrome

1. Settings → **Connectors** → Add custom connector → **Web / Remote**
2. Name: `nomi`
3. URL: `https://nomi.exora.solutions/mcp`
4. Authentication: **No sign in** (or fixed credential), then under **Request headers** add:
   - Header: `Authorization`
   - Value: `Bearer nomi_…` (from `/srv/apps/shared/mcp-nomi/.env`)
5. Enable the connector in a chat and ask Claude to list Nomi projects.

### Local Claude Code / Codex (stdio still fine)

```bash
NOMI_BASE_URL=https://nomi.exora.solutions NOMI_API_TOKEN=… node src/mcp-stdio.js
```

Or point clients at the remote URL if they support Streamable HTTP MCP.

## Setup

```bash
cd /srv/apps/shared/mcp-nomi
npm ci
# .env is written by /srv/apps/nomi/source/scripts/create-nomira-bot.ts
cp .env.example .env   # only if minting manually
```

## CLI

```bash
nomi projects list
nomi tasks list
nomi chat post --channel CHANNEL_ID --text "hello from nomira"
nomi tools
```

## MCP (Claude / Codex / Cursor)

Command: `node /srv/apps/shared/mcp-nomi/src/mcp-stdio.js`

Env: `NOMI_BASE_URL`, `NOMI_API_TOKEN` (loaded from package `.env` automatically).

### Cursor (`~/.cursor/mcp.json`)

```json
"nomi": {
  "command": "node",
  "args": ["/srv/apps/shared/mcp-nomi/src/mcp-stdio.js"]
}
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.nomi]
command = "node"
args = ["/srv/apps/shared/mcp-nomi/src/mcp-stdio.js"]
```

### Claude Code (project `.mcp.json`)

```json
{
  "mcpServers": {
    "nomi": {
      "command": "node",
      "args": ["/srv/apps/shared/mcp-nomi/src/mcp-stdio.js"]
    }
  }
}
```
