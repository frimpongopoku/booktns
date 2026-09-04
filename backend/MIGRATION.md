# Backend separation — status and how to finish it

The NestJS API in `backend/` is **stood up and working, but the migration is
partial**. This document is the handover: what moved, what didn't, and the
recipe for the rest.

**Nothing is broken right now.** This is a strangler migration — the Next.js
API routes are all still live and still serving the dashboard. The new API
runs alongside them. You can deploy the backend, point nothing at it, and the
app behaves exactly as before.

---

## What actually moved

| Area | Endpoint | State |
|---|---|---|
| Sign in / out | `POST`/`DELETE /api/auth/session` | ported |
| Session read | `GET /api/auth/me` | new |
| Memberships | `GET /api/auth/memberships` | ported |
| Shop switching | `POST /api/auth/switch-vendor` | ported |
| Guest booking | `POST /api/bookings` | ported, incl. the serializable slot transaction |
| Booking list | `GET /api/bookings` | ported, incl. Service-staff narrowing |
| Storefront read | `GET /api/storefront/:slug` | **new** |
| Vendor slugs | `GET /api/storefront/slugs` | **new** |
| Custom domain resolve | `GET /api/storefront/resolve-domain` | **new** |
| Booking by slug | `GET /api/storefront/booking/:slug` | **new** |
| Order by slug | `GET /api/storefront/order/:slug` | **new** |
| Feedback | `POST /api/feedback` | ported |
| Liveness | `GET /api/ping` | ported |
| Health | `GET /api/health` | ported |

The five **new** endpoints are the point of the exercise. They didn't exist
before because the storefront pages queried Prisma directly inside server
components — there was nothing to expose. Splitting the backend out is what
makes them necessary.

Also moved: `prisma/` (schema + all 22 migrations) and 33 framework-agnostic
`lib/*` modules — email, SMS, PDF, storage, availability, deposit, phone,
slugs, verification, domains, health.

## What has NOT moved

Still served by Next.js API routes, still working:

`orders` · `orders/[id]` · `orders/by-slug/[slug]/pdf` · `bookings/[id]` ·
`bookings/by-slug/[slug]` · `services` · `services/[id]` · `products` ·
`products/[id]` · `staff` · `staff/[id]` · `payment-methods` ·
`payment-methods/[id]` · `media` · `media/[id]` · `videos` · `videos/[id]` ·
`vendor` · `vendor/domain` · `vendor/hours` · `vendors/check-slug` ·
`availability` · `verification` · `support` · `calendar/[token]` ·
all seven `superadmin/*` routes.

**No frontend code calls the new API yet.** `lib/api-client.ts` exists and is
ready, but every page and component still uses the Next.js routes and direct
Prisma access. That's the second half of the work.

---

## Porting recipe

Each remaining route follows the same shape. Using `services` as the example:

1. `backend/src/modules/catalog/services.schemas.ts` — copy the Zod schemas
   from the Next route **verbatim**. The messages are rendered inline in
   forms; rewording them changes the UI.
2. `…/services.service.ts` — copy the handler body. Convert
   `NextResponse.json({error, code}, {status})` into the matching Nest
   exception with the same body: `BadRequestException` (400),
   `NotFoundException` (404), `ConflictException` (409),
   `ForbiddenException` (403). The `{ error, code }` shape must survive —
   `HttpExceptionFilter` passes it through untouched, and the frontend's
   `ApiErrorBody` parses it.
3. `…/services.controller.ts` — `@Roles("Owner", "Management")` replaces
   `requireRole([...])`. `@Public()` for genuinely open endpoints.
   **Omitting the decorator means authenticated-any-role, not public** —
   the global `SessionGuard` denies by default.
4. Register the module in `app.module.ts`.
5. Point the frontend at it, then delete the Next route.

### Vendor scoping is the thing to be careful about

Every ported query must stay scoped to `session.vendorId`. In the Next routes
that came from `auth.session.vendorId`; here it's `@CurrentSession()`. A
query that loses its scope leaks across tenants and nothing will fail loudly.

The same applies to `Staff.email` lookups: go through
`common/lib/memberships.ts`, never `findFirst({ where: { email } })`. Prisma
**drops an `undefined` filter** rather than matching nothing, so a missing
email silently widens the query to every row — that exact bug shipped once
already.

---

## Deploying the API to Railway

1. New project → **Deploy from GitHub repo** → select this repo.
2. **Settings → Root Directory: `backend`.** Without this Railway builds the
   Next.js frontend instead.
3. It picks up `railway.toml` → builds the `Dockerfile`.
4. Add a **Postgres** service in the same project. Copy its `DATABASE_URL`
   into the API service's variables.
5. Set the rest from `backend/.env.example`.
6. Healthcheck is already `/api/ping` via `railway.toml`. **Never point it at
   `/api/health`** — that makes real round trips to Postgres, R2, Resend and
   Firebase, so a provider blip would restart your API.

Migrations are **not** run by the Docker build. Run them deliberately:

```bash
DATABASE_URL="<railway url>" npm run db:deploy
```

Then, once, on a fresh database:

```bash
DATABASE_URL="<railway url>" npm run bootstrap:superadmin
```

---

## The three settings that will cost you an afternoon

**1. `JWT_SECRET` must be byte-identical** on Vercel and Railway. Both sign
and verify the same cookie. A mismatch logs everyone out with no error
anywhere — it just looks like sign-in silently failing.

**2. `CORS_ORIGINS` must list the exact frontend origin,** scheme included.
A missing entry presents as "I'm signed in but the API says I'm not".
Wildcards are not an option: browsers reject `*` when credentials are
involved.

**3. Cookie scoping decides whether sessions work at all.**

- **Same apex** (`app.booktns.com` + `api.booktns.com`):
  `COOKIE_DOMAIN=.booktns.com`, `COOKIE_SAMESITE=lax`. **Do this.**
- **Unrelated hosts** (`booktns.vercel.app` + `*.up.railway.app`):
  requires `COOKIE_SAMESITE=none`, which makes the session a third-party
  cookie. Safari's ITP blocks it and Chrome is phasing it out — real users
  will lose sessions at random. Staging only.

This is the strongest practical argument for putting the API on a subdomain
of your own apex before launch.

---

## Known gaps

- **`common/lib/prisma-client.ts` is a second Prisma client** alongside
  `PrismaService`. The ported helpers were written against Next's module-scope
  `db` singleton; rewriting all 33 into injectable providers in the same pass
  would have been a second migration hidden inside this one. Two clients means
  two connection pools — fine at current scale, worth consolidating before it
  isn't. New code should inject `PrismaService`.
- **React's `cache()` was stripped** from the ported `bookings`/`orders`/
  `vendors` helpers — it only memoises within a React render. Repeated calls in
  one request now hit the database more than once. Add request-scoped caching
  if a hot path shows up.
- **OG image and favicon generation stayed on the frontend** (`next/og` is
  Next-only). They still query Prisma directly and will need the storefront
  endpoint instead.
- **`proxy.ts` still queries Prisma directly** for custom-domain routing. It
  should call `GET /api/storefront/resolve-domain`, which exists for exactly
  this — but that adds a network hop to a large share of requests, so it wants
  a cache in front of it.
- **No tests.** The port was verified by typecheck, build, boot, and manual
  calls against the dev database. The serializable booking transaction in
  particular deserves a concurrency test before it takes real traffic.
