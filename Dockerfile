FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "--hostname", "0.0.0.0"]
