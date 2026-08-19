# Nomi

Internal team workspace: **channels**, **DMs**, **projects**, and **tasks**.

One Next.js app. One SQLite file. No Docker. No Mattermost. No PostgreSQL.

---

## Requirements

- Node.js 20+ (18+ may work)
- npm

---

## Fresh install on a server (recommended)

```bash
git clone <YOUR_REPO_URL> nomi
cd nomi
cp .env.example .env
npm run setup
npm run build
npm start
```

Open **http://SERVER_IP:3001**

This repo includes a starter database at `data/nomi.db` with demo users and sample data.

## How orgs & employees work

1. **Admin** creates the workspace (company name + admin email) — or uses the seeded admin.
2. Admin opens **Team** in the sidebar and adds employees (name, email, temporary password).
3. Employees sign in and only see that company’s channels, DMs, projects, and tasks.
4. Open self-registration is disabled once a workspace exists.

**Demo admin:** `raghu@nomi.local` / `password123`  
**Demo member:** `alex@nomi.local` / `password123`

---

## Local development

```bash
cp .env.example .env
npm run setup
npm run dev
```

Open http://localhost:3001

---

## Optional: reset database from scratch

If you want a clean DB instead of the included one:

```bash
rm -f data/nomi.db
npx prisma migrate deploy
npm run db:seed
```

---

## What is included

| Feature | Status |
|---------|--------|
| Login / register | Yes |
| Public channels + messaging | Yes |
| Direct messages | Yes |
| Projects (+ linked `#proj-*` channel) | Yes |
| Task kanban + global task list | Yes |
| SQLite database (`data/nomi.db`) | Yes (committed) |

---

## Files your friend needs

| File | Purpose |
|------|---------|
| `.env` | Copy from `.env.example` (already correct for SQLite) |
| `data/nomi.db` | App database (ships with the repo) |
| `prisma/migrations/` | Schema history for `migrate deploy` |

Do **not** commit secrets later. Demo passwords are only for local/team bootstrap — change them for production.

---

## Run in background on a Linux server (pm2)

```bash
npm install -g pm2
npm run setup
npm run build
pm2 start npm --name nomi -- start
pm2 save
```

---

## Project docs

See [PLAN.md](PLAN.md) for the product plan.
