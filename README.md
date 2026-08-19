# Nomi

Internal team workspace: **channels**, **DMs**, **projects**, and **tasks**.

One Next.js app. One SQLite file. No Docker. No Mattermost. No PostgreSQL.

---

## Requirements

- Node.js 20+ (18+ may work)
- npm

---

## Fresh install on a server

```bash
git clone https://github.com/rvamsi201-vk/Nomi.git
cd Nomi
cp .env.example .env
npm run setup
npm run build
npm start
```

Open **http://SERVER_IP:3001**

The database ships **empty** (schema only). First-time setup in the browser:

1. Go to **/register** → create company workspace + admin account  
2. Sign in as that admin  
3. Open **Team** → add employees (name, email, temporary password)  
4. Employees sign in at **/login** (they do not self-register)

Once a workspace exists, public registration is locked.

---

## How orgs & employees work

| Role | What they do |
|------|----------------|
| **Admin** | Creates the org, adds/removes employees from **Team** |
| **Member** | Uses channels, DMs, projects, and tasks inside that org |

---

## Local development

```bash
cp .env.example .env
npm run setup
npm run dev
```

Open http://localhost:3001/register to create your first workspace.

Optional demo data (local only):

```bash
npm run db:seed
```

---

## Reset database (clean again)

```bash
rm -f data/nomi.db
npx prisma migrate deploy
```

Then create the org again via **/register**.

---

## What is included

| Feature | Status |
|---------|--------|
| Create org + admin | Yes (`/register` first time) |
| Admin adds employees | Yes (`/team`) |
| Public channels + messaging | Yes |
| Direct messages | Yes |
| Projects (+ linked `#proj-*` channel) | Yes |
| Task kanban + global task list | Yes |
| Clean SQLite DB (`data/nomi.db`) | Yes (empty until first register) |

---

## Run in background (pm2)

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
