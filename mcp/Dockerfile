FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY nomira-agent-server.js ./

ENV NODE_ENV=production
ENV NOMIRA_AGENT_PORT=3015
ENV MCP_HTTP_PORT=3016
ENV MCP_HTTP_HOST=0.0.0.0
ENV CODEX_BIN=/opt/codex/codex
ENV PATH=/opt/codex:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV NOMIRA_WORKDIR=/srv/apps/nomi
ENV HOME=/root

EXPOSE 3015 3016
CMD ["node", "nomira-agent-server.js"]
