# Deploying Booktns

**Vercel runs the app. Railway runs Postgres. That's the whole split.**

There is no separate backend to deploy. Booktns is one Next.js App Router
application: the API routes under `app/api/*` and the server components that
query Prisma directly both run inside the same deployment. Railway is only a
database host here — it needs no GitHub connection.

---

## Order of operations

Do these in order. Steps 3 and 5 are the ones that break things if skipped.

### 1. Railway — create the database

1. New project → **Deploy Postgres**. Nothing else; no GitHub connection.
2. Pick a region **close to your Vercel region** (see step 2). Every page
   render makes several queries, so a transatlantic hop between the two is
   felt on every request, not just occasionally.
3. Postgres service → **Variables** → copy `DATABASE_URL`.

> **Copy the public URL, not the internal one.** Railway also shows a
> `*.railway.internal` host. That only resolves inside Railway's private
> network — Vercel is outside it and will fail to connect. The public URL is
> the one with a real hostname and port.

### 2. Vercel — import the repo

1. **Add New → Project → Import** `frimpongopoku/booktns`.
2. Framework preset: **Next.js** (auto-detected).
3. Leave the build command alone — `vercel.json` and `package.json` already
   set it correctly.
4. Region: `vercel.json` pins **`lhr1` (London)**, the closest Vercel region
   to Ghana. If you change it, change Railway's region to match.

### 3. Environment variables

Set these in Vercel → Settings → Environment Variables. Use `.env.example` as
the checklist — it documents every variable and where to get it.

**Will not boot / will 500 without these:**

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Railway, step 1 (public URL) |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://booktns.com` — no trailing slash |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console → Project settings → Web app |
| `FIREBASE_ADMIN_*` | Firebase console → Service accounts → Generate key |

**Required for production correctness — set before real vendors sign up:**

| Variable | What breaks without it |
|---|---|
| `CLOUDFLARE_R2_PRIVATE_BUCKET` | **ID documents are destroyed.** See the warning below. |
| `CLOUDFLARE_R2_*` (public set) | Product photos and logos can't be uploaded |
| `RESEND_API_KEY`, `EMAIL_FROM` | No booking emails at all |
| `SUPPORT_INBOX_EMAIL` | Feedback silently routes to `support@biibisoft.com` |

**Optional:** `AFRICAS_TALKING_*` (SMS), `SENTRY_*`, `NEXT_PUBLIC_POSTHOG_*`,
`PLATFORM_APEX_IP` / `PLATFORM_CNAME_TARGET` (custom domains),
`DEMO_VENDOR_SLUGS`.

> ⚠️ **`CLOUDFLARE_R2_PRIVATE_BUCKET` is not optional in production.**
> `lib/private-storage.ts` falls back to writing government ID scans to
> `.private-uploads/` on local disk. Vercel's filesystem is ephemeral — every
> deploy and every cold start wipes it. Verification would appear to work and
> then lose the documents. The code logs a loud warning; heed it.

### 4. Deploy

Push to `main`, or hit Deploy. The build runs:

```
prisma generate && node scripts/migrate-if-production.mjs && next build
```

`prisma generate` is in the build command as well as `postinstall` because
Vercel caches `node_modules` and can skip `postinstall` on subsequent builds,
leaving a stale client.

### 5. Bootstrap the first platform admin

**Nothing else grants access to `/superadmin`.** There is no signup route and
the seed must never run in production. Once, after the first deploy:

```bash
DATABASE_URL="<railway public url>" npm run bootstrap:superadmin
```

Defaults to `FIRST_SUPERADMIN_EMAIL` in `prisma/first-superadmin.ts`. Pass an
email argument to add a different one. Idempotent — safe to re-run.

### 6. Point DNS at Vercel

Vercel → Settings → Domains. Then confirm `NEXT_PUBLIC_APP_URL` matches
exactly — canonical URLs, OG images, sitemap and the booking links in emails
are all built from it.

---

## Migrations

`scripts/migrate-if-production.mjs` runs `prisma migrate deploy` **only** when
`VERCEL_ENV === "production"`.

That guard is deliberate. Vercel builds every branch and pull request, and
preview deployments inherit production environment variables by default — so
an unguarded `migrate deploy` in the build command lets any open PR migrate
your production database. Local builds are skipped too; use
`npx prisma migrate dev` there, which is interactive and writes the migration
file.

To apply migrations by hand:

```bash
DATABASE_URL="<railway public url>" npm run db:deploy
```

> **Before the first deploy, check this one:** migration
> `20260903120000_staff_multi_vendor_membership` drops the global unique index
> on `Staff.email` and creates `Staff_vendorId_email_key` on
> `(vendorId, email)`. It fails if any vendor already has the same email on two
> staff rows. On a fresh database this is a non-issue.

**Never run `prisma db seed` against production.** It is demo fixtures and it
deletes existing rows, including real vendor accounts.

---

## Things that behave differently on serverless

Worth knowing when something looks wrong in production but works locally.

**Background work.** Every email, SMS and PDF is deferred with `after()` from
`next/server`, not left as a floating promise. On Vercel the function can be
frozen the instant a response is returned, so unawaited work is not
"background" — it's work that may never run. If you add a new notification,
wrap it in `after()` and `await` it inside, or it will silently not send.

**Database connections.** `lib/db.ts` creates one Prisma client per instance,
and serverless runs many instances. If you see connection-limit errors under
load, switch `DATABASE_URL` to a pooled connection string rather than raising
the app's pool size.

**Rate limiting is per-instance.** The throttle in `app/api/feedback/route.ts`
is an in-memory `Map`. With N instances the effective limit is N × 5/hour. It
slows casual abuse; it is not a real rate limiter. Revisit alongside login
rate limiting, when a shared store earns itself.

**Health checks.** Never point Vercel's or an uptime monitor's liveness probe
at `/api/health` — it makes real authenticated round trips to Resend, R2 and
the database with a 3s budget each. Use `/api/ping`, which is trivial and
dependency-free. `/api/health` is for a human or a status dashboard.

**Function budgets.** `vercel.json` raises `maxDuration` for the routes that
do real work — PDF generation (Satori → resvg → R2 upload), media upload,
verification, and the health check. Hobby plans cap at 60s; the values here
stay within that.

---

## Verifying a deploy

```bash
curl -s https://<your-domain>/api/ping                 # 200, no dependencies
curl -s https://<your-domain>/api/health | jq .        # each check individually
```

`/api/health` reports `ok` / `warn` / `error` per dependency. `warn` means
working but on a dev fallback that must not be in production — the private
storage bucket is the one to watch. Only `error` returns 503.

Then, by hand:

1. `/` loads
2. `/login` → Google sign-in with an allowlisted staff email
3. Create a test booking on a storefront → confirmation email arrives
4. Confirm it in the dashboard → PDF link appears within ~15 seconds

Step 4 is the one that proves `after()` is working. If the email arrives but
the PDF never appears, the deferred work is being cut short.
