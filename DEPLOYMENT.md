# GVTrainer production deployment (Hostinger Business + Supabase + Cloudinary)

Monolithic layout: **Next.js** (frontend) + **Express API** (backend) + **Supabase Postgres** + **Cloudinary** for binary assets. JWT auth stays in the Node API — **do not enable Supabase Auth**.

## 1. Supabase (database only)

1. Create a project on [Supabase](https://supabase.com).
2. In **Project Settings → Database**, copy:
   - **Connection pooling** URI (PgBouncer, port **6543**) → use as `DATABASE_URL` for the API.
   - **Direct** URI (session mode, port **5432**) → use as `DIRECT_URL` for Prisma migrations.

Example shape:

```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

3. Keep `connection_limit=1` on small/Hobby tiers to avoid exhausting DB connections.

## 2. Prisma migrate (against Supabase)

From `backend/`:

```bash
npm install
npx prisma migrate deploy
```

For a **brand-new** Supabase project, migration `20260513190000_init_schema` creates the full schema (indexes included).

If you **already have** tables from `prisma db push` locally, do **not** blindly apply the init migration on top — either baseline using Prisma’s docs (`prisma migrate resolve`) or use `prisma db pull` + diff tools so you don’t duplicate objects. For net-new production DBs, prefer `migrate deploy` only.

Generate client after schema changes:

```bash
npx prisma generate
```

### Prisma troubleshooting

- **P3015 (“Could not find migration file … migration.sql”)** — Every folder under `prisma/migrations/` (except `migration_lock.toml`) must contain a `migration.sql`. Remove any empty migration directory or restore its SQL file, then run `migrate deploy` again from `backend/`.
- **P3018 (“A migration failed to apply”)** — Fix the SQL (or remove a leading UTF-8 BOM — see below), then mark the failed migration as rolled back and redeploy:
  ```bash
  npx prisma migrate resolve --rolled-back "20260513190000_init_schema"
  npx prisma migrate deploy
  ```
  Only use `--applied` if you manually fixed the database to match that migration.
- **BOM / `\u{feff}` syntax error** — If Postgres reports `syntax error at or near "\u{feff}"`, the file `migration.sql` starts with a **UTF-8 BOM**. Re-save it as **UTF-8 without BOM** (or re-copy from the repo after the fix). PowerShell `Set-Content -Encoding utf8` often adds a BOM; prefer `Out-File -Encoding utf8NoBOM` (PS 6+) or Node to write the file.

### Bootstrap admin (no demo trainer/client)

Migrations **do not** create users. The seed creates **only one** `ADMIN` user from your env — trainers and clients are added later in the **Admin** UI.

1. In `backend/.env` (same `DATABASE_URL` as production when deploying), set:

```env
SEED_ADMIN_EMAIL=you@yourcompany.com
SEED_ADMIN_PASSWORD=YourStrongPasswordHere
```

2. From `backend/`:

```bash
npx prisma db seed
```

3. Sign in at `/login` with that email and password. Then use **Admin → Trainers** and **Admin → Clients** to create real accounts.

**Reset admin password:** set `SEED_FORCE_ADMIN_PASSWORD=true`, run `npx prisma db seed` once, then remove the flag.

**Old demo users:** If you already ran a previous seed (`*@gvtrainer.demo`), those rows may still exist. You can delete them in the Supabase SQL editor (respect foreign keys: remove dependent rows first) or leave them unused.

## 3. Cloudinary (images only)

Create keys in the Cloudinary dashboard. Set `CLOUDINARY_*` in `backend/.env`. Only **HTTPS URLs** are stored in PostgreSQL — no binary columns for images.

PDF reports are **streamed** from the API (`POST /reports/clients/:clientId/pdf`) and are **not** uploaded to Cloudinary.

## 4. Backend on Hostinger

1. Upload the repository (without `node_modules`).
2. On the server, in `backend/`:

```bash
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
NODE_ENV=production node dist/index.js
```

(`db:seed` requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` — run once after deploy.)

4. Build locally or in CI before upload:

```bash
npm run build
```

5. Process manager: use Hostinger’s Node selector or `pm2`/similar **single** worker to limit RAM (Puppeteer for PDFs is memory-heavy — generate reports sparingly).

6. Environment: paste production `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL` (your live site), `CLOUDINARY_*`, optional `RESEND_API_KEY` / `EMAIL_FROM`.

7. **Trust proxy**: enabled automatically when `NODE_ENV=production` so rate limiting works behind Hostinger’s reverse proxy.

## 5. Frontend on Hostinger

Build Next.js with standalone output (configured in `frontend/next.config.ts`):

```bash
cd frontend
npm ci
npm run build
```

Deploy the `.next/standalone` artifact plus static files per [Next standalone deployment](https://nextjs.org/docs/app/building-your-application/deploying#nodejs-server). Set `NEXT_PUBLIC_API_URL` to your **public API URL** (HTTPS).

## 6. Cost / resource discipline

- **Supabase**: pooled `DATABASE_URL`, indexes on hot paths, pagination already used on list endpoints; attendance analytics uses SQL `COUNT` instead of loading all rows.
- **Cloudinary**: uploads apply `quality: auto` / `fetch_format: auto` to shrink delivery cost.
- **PDF**: generated in memory and streamed; nothing persisted — minimise concurrent generations on small VPS/shared hosting.

## 7. Email (optional)

Configure Resend (`RESEND_API_KEY`, `EMAIL_FROM`). Forgot-password emails send when these are set; JWT flow is unchanged.
