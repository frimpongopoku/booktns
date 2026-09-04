# Deploying Booktns

Three services:

| Service | Platform | What it is |
|---|---|---|
| **Frontend** | Vercel | The Next.js app — storefronts, dashboard, superadmin console |
| **API** | Railway | The NestJS backend in `backend/` |
| **Database** | Railway | Postgres |

Both Railway services live in **one Railway project** so the database can be
reached over the private network.

> **The migration is partial and that is fine.** Most of the app still uses
> the Next.js API routes and queries Prisma directly from server components.
> The NestJS API runs alongside them. Deploying it changes nothing about how
> the app behaves today — see `backend/MIGRATION.md`. The frontend needs a
> live database of its own regardless.

---

## Order of operations

Steps 3, 6 and 7 are the ones that break things if skipped.

### 1. Railway — Postgres

1. **New Project → Deploy Postgres.** Nothing else yet.
2. Pick a region close to your Vercel region (`vercel.json` pins `lhr1`,
   London — the closest to Ghana). Every page render makes several queries;
   a transatlantic hop is felt on every request.
3. Postgres service → **Variables** → copy both `DATABASE_URL` values. There
   are two, and the difference matters:
   - the **private** one (`*.railway.internal`) — for the API service, which
     lives inside Railway
   - the **public** one — for Vercel and your laptop, which don't

### 2. Railway — the API

1. In the **same project** → **New → GitHub Repo** → `frimpongopoku/booktns`.
2. **Settings → Root Directory: `backend`.** Without this Railway builds the
   Next.js frontend instead.
3. It picks up `backend/railway.toml` and builds the Dockerfile. Healthcheck
   is already `/api/ping`.
4. Set the variables from `backend/.env.example`:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Railway's **private** URL |
   | `JWT_SECRET` | generate once (below) — must match Vercel exactly |
   | `SUPERADMIN_JWT_SECRET` | generate a **second, different** one |
   | `PUBLIC_APP_URL` | your Vercel URL, e.g. `https://booktns.com` |
   | `FIREBASE_ADMIN_*` | Firebase → Service accounts → Generate key |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Resend |
   | `CLOUDFLARE_R2_*` | R2 (see the warning in step 3) |

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. **Settings → Networking → Generate Domain.** Note the URL — Vercel needs
   it as `NEXT_PUBLIC_API_URL`.

### 3. Cloudflare R2 — two buckets

Not optional, and the second one especially:

- **Public bucket** — product photos, logos, PDFs. Enable public access.
- **Private bucket** (`CLOUDFLARE_R2_PRIVATE_BUCKET`) — government ID scans
  for vendor verification. **No public access, no custom domain.**

> ⚠️ Without `CLOUDFLARE_R2_PRIVATE_BUCKET`, `lib/private-storage.ts` falls
> back to writing ID documents to local disk. Both Vercel and a Railway
> container wipe that on every deploy. Verification would appear to work and
> then lose the documents. The code logs a loud warning; heed it.

### 4. Vercel — the frontend

1. **Add New → Project → Import** `frimpongopoku/booktns`.
2. Framework preset **Next.js**, root directory left at the repo root.
3. Leave the build command alone — `vercel.json` and `package.json` set it.

### 5. Vercel environment variables

Use `.env.example` as the checklist.

**Won't boot without these:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Railway's **public** URL |
| `JWT_SECRET` | **the same string as Railway** |
| `NEXT_PUBLIC_APP_URL` | your production URL, no trailing slash |
| `NEXT_PUBLIC_API_URL` | the Railway API URL from step 2.5 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase → Web app config |
| `FIREBASE_ADMIN_*` | same service-account key as the API |

**Needed before real vendors sign up:** `CLOUDFLARE_R2_*` (both buckets),
`RESEND_API_KEY` / `EMAIL_FROM`, `SUPPORT_INBOX_EMAIL`.

**Optional:** `AFRICAS_TALKING_*`, `SENTRY_*`, `NEXT_PUBLIC_POSTHOG_*`,
`PLATFORM_APEX_IP` / `PLATFORM_CNAME_TARGET`, `DEMO_VENDOR_SLUGS`.

### 6. Firebase — authorised domains

Firebase Console → **Authentication → Settings → Authorized domains** → add
your production domain.

> Forgetting this is the single most common cause of "login does nothing in
> production". The popup opens, Google succeeds, and the SDK rejects with
> `auth/unauthorized-domain`. The login page now surfaces that code and sends
> it to Sentry, so at least it is diagnosable.

### 7. Bootstrap the first platform admin

**Nothing else grants `/superadmin` access.** No signup route, and the seed
must never run in production. Once, after the first deploy:

```bash
cd backend
DATABASE_URL="<railway public url>" npm run bootstrap:superadmin
```

Defaults to `FIRST_SUPERADMIN_EMAIL` in `prisma/first-superadmin.ts`. Pass an
email argument to add a different one. Idempotent.

### 8. DNS

Vercel → **Settings → Domains**. Then confirm `NEXT_PUBLIC_APP_URL` matches
exactly — canonical URLs, OG images, the sitemap and every booking link in an
email are built from it.

---

## Migrations — one owner only

Both projects carry an identical `prisma/migrations/`. **Only one may apply
them.**

The Vercel build already does, via `scripts/migrate-if-production.mjs`, which
runs `prisma migrate deploy` **only** when `VERCEL_ENV === "production"`. That
guard exists because Vercel builds every branch and preview deployments
inherit production environment variables — without it, any open PR could
migrate your production database.

**So: do not add a release command to the Railway API service.** Leave
migrations to the Vercel production build.

To run them by hand instead:

```bash
DATABASE_URL="<railway public url>" npm run db:deploy
```

> **Check this before the first deploy:** migration
> `20260903120000_staff_multi_vendor_membership` drops the global unique index
> on `Staff.email` and creates one on `(vendorId, email)`. It fails if any
> vendor already has the same email on two staff rows. On a fresh database,
> a non-issue.

**Never run `prisma db seed` against production.** It is demo fixtures and it
deletes existing rows, including real vendor accounts.

---

## The three things that will cost you an afternoon

**1. `JWT_SECRET` must be byte-identical on Vercel and Railway.** The frontend
mints and stores the cookie; the API verifies the token inside it. A mismatch
logs everyone out with no error anywhere — it just looks like sign-in silently
failing.

**2. Use the right `DATABASE_URL` in each place.** Railway's private
`*.railway.internal` host only resolves inside Railway. The API uses it;
Vercel and your laptop need the public one.

**3. Point liveness probes at `/api/ping`, not `/api/health`.** Already
configured in `railway.toml`. `/api/health` is safe to hit — it's cached and
redacted (below) — but it still reflects third-party state, so a Resend blip
would fail the probe and restart a service that is itself perfectly healthy.
`/api/ping` touches nothing.

### What you do *not* have to configure

The API is **cookie-blind**: it returns a JWT in the response body and reads
`Authorization: Bearer`. The Next.js app owns the cookie and mints it
host-only. So there is **no CORS origin allowlist and no cookie domain to
set** — which is what makes vendor custom domains work without touching an
env var each time one is added. See `backend/MIGRATION.md`.

---

## Verifying a deploy

```bash
curl -s https://<api-host>/api/ping                    # {"ok":true,...}
curl -s https://<api-host>/                            # HTML landing page
curl -s https://<api-host>/api/health | jq '.status'   # ok | warn | error
curl -s https://<frontend>/api/ping                    # frontend is up
```

`/api/health` serves a human status page to a browser and JSON to anything
else (or with `?format=json`). `warn` means working but on a dev fallback
that must not be in production — **private storage is the one to watch**.
Only `error` returns 503.

### It is public, so it is built to be hit

Two properties make that safe:

- **Cached, 20s, with request coalescing.** One cheap HTTP request used to
  fan out into nine real upstream calls — a Postgres query, two R2
  `HeadBucket` calls, live API calls to Resend and Africa's Talking, a DNS
  lookup. A bot looping on it would burn third-party quota and real money.
  Now a flood of requests produces at most one sweep per window, and
  concurrent callers share a single in-flight run rather than each starting
  their own.
- **Redacted.** The public view is name, status and timing only. It no longer
  prints bucket names, provider names or raw upstream error text — that was
  free reconnaissance on an unauthenticated endpoint.

The unredacted report lives at **`GET /api/health/detail`**, superadmin-only
and uncached, for actually diagnosing a broken deploy.

Then by hand:

1. `/` loads
2. `/login` → Google sign-in with an allowlisted staff email
3. Book on a storefront → confirmation email arrives
4. Confirm it in the dashboard → PDF link appears within ~15 seconds

Step 4 proves the deferred work is surviving. If the email arrives but the PDF
never appears, `after()` is being cut short.

---

## Local development

```bash
docker compose up -d              # Postgres on 5434
npm install && npm run dev        # frontend on 2665
cd backend && npm install && npm run start:dev   # API on 2666
```

Ports are pinned deliberately — 2665/2666, mnemonic **BOOK** on a phone
keypad, clear of the crowded 3000/4000/8000 ranges (macOS holds 5000 and 7000
for AirPlay). `npm run dev` passes `-p` explicitly so it fails loudly rather
than drifting to another port, which would break the API URL and cookie host
assumptions.
