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
| Sign in | `POST /api/auth/session` | ported — returns a JWT in the body, sets no cookie |
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
| Landing page | `GET /` | **new** — human-readable, outside the /api prefix |
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

**Almost no frontend code calls the new API yet.** The auth plumbing is
wired and working — `lib/api-client.ts`, `lib/session-cookie.ts`, the BFF
proxy at `app/api/admin/[...path]`, and the `session-v2` /
`switch-vendor-v2` route handlers. But every page and component still uses
the original Next.js routes and direct Prisma access. Switching them over is
the second half of the work.

The old `app/api/auth/session` route is deliberately still in place: it mints
a cookie with the same secret and payload shape, so tokens are
interchangeable and the un-migrated Next.js routes keep verifying them via
`lib/auth.ts`. Delete it once the login page points at `session-v2`.

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

## The auth architecture, and why it looks like this

**The API is cookie-blind. The frontend owns the cookie. Nothing outside a
server-side route handler ever touches the raw token.**

Write that down as the invariant. Everything else follows from it.

- The NestJS API never sets `Set-Cookie`. `/auth/session` and
  `/auth/switch-vendor` return a signed JWT **in the JSON body**.
- Next.js route handlers (`app/api/auth/session-v2`, `.../switch-vendor-v2`)
  are the only things that call `cookies().set()`. They mint an **httpOnly,
  host-only cookie with no `domain` attribute** — scoped to whatever host the
  browser is currently on.
- Every other authenticated browser call goes through the BFF proxy at
  `app/api/admin/[...path]/route.ts`, which reads the cookie server-side and
  re-attaches it as `Authorization: Bearer`. **Browser JavaScript never holds
  or sends the token.**
- The only direct browser → API calls are unauthenticated public storefront
  reads. They carry no credentials, which is exactly why CORS can be
  `origin: true, credentials: false`.

### Why not just have the API set the cookie

Because it breaks custom domains, in two ways at once:

1. The API would be a different origin from the frontend, making the session a
   **third-party cookie** requiring `SameSite=None`. Safari's ITP blocks those
   and Chrome is phasing them out — sessions would drop at random for real
   users.
2. Credentialed CORS requires an explicit origin allowlist (browsers reject
   `*` with credentials). That allowlist would have to contain **every
   vendor's custom domain**, which is unknowable at deploy time. Each new
   vendor domain would silently fail until someone updated an env var.

The host-only cookie sidesteps both: a vendor signing in on their own domain
gets a first-party cookie for that domain, with zero configuration.

**Do not add a `domain` attribute to the session cookie.** Even
`.booktns.com` — which looks harmless — breaks every custom domain at once,
because a vendor's host is not under that apex.

### Two token spaces, two secrets

Vendor sessions and the superadmin console are fully parallel: separate table,
separate payload shape, separate frontend cookie, separate BFF path prefix.
They are now signed with **different secrets** (`JWT_SECRET` vs
`SUPERADMIN_JWT_SECRET`), so a token from one space fails signature
verification in the other outright. The `kind` discriminator check is still
there, but it is no longer the only thing standing between the two — a future
route that forgets to check is still safe.

### Still true regardless

- `JWT_SECRET` must be byte-identical on Vercel and Railway. The frontend
  stores what the API signs.
- Guarded routes derive `vendorId` from the **verified token**, never from a
  client-supplied field. Every mutating route: does it ignore the client's
  vendorId and use `session.vendorId`?
- The UI-side role checks in dashboard pages are **UX, not security**. The
  API's `@Roles(...)` guard is the enforcement point.

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
