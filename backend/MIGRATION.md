# Backend separation — status and how to finish it

The frontend now talks to the NestJS API for the entire vendor dashboard,
authentication, and every guest-facing write (booking, checkout, self-service
edit/cancel). The Next.js routes for all of that are deleted — this API is
no longer a parallel, unused system sitting next to the old one.

**What is left on Next.js:** the superadmin console (7 routes, its own
parked token space), the public storefront *read* path (`app/[slug]/*`,
`app/booking/[slug]`, `app/order/[slug]`, sitemap/robots/OG images — all
still query Prisma directly), the QR code route, and vendor onboarding
(`app/onboarding/actions.ts`, which creates the first Vendor + owner Staff
row directly — CLAUDE.md documents this as the one deliberate exception to
"Google Sign-In never creates a Staff record").

## What actually moved

Every endpoint the vendor dashboard, guest booking/checkout, and auth need.
The matching Next.js route for each of these is **deleted**, not just
unused:

| Area | Endpoints |
|---|---|
| Auth | sign-in, /auth/me, memberships, switch-vendor (cookie-blind — see below) |
| Bookings | create (guest), list + mark-seen, PATCH (status/reassign/reschedule), self-service edit/cancel by slug |
| Orders | create (guest), list + mark-seen, status update, PDF receipt |
| Storefront reads | vendor read, slugs, resolve-domain, booking/order by slug |
| Catalog | services, products (CRUD), low-stock names |
| Staff | CRUD (Owner), list (Owner + Management — see note below) |
| Payments | payment methods CRUD, Owner-only |
| Media | list, upload (multer, memory storage), tag, delete |
| Videos | CRUD |
| Vendor | settings, dashboard-context (any role), business hours, custom domain, slug availability |
| Availability | public slot lookup |
| Verification | ID submission (multer, sharp), status |
| Support | platform support messages |
| Calendar | ICS subscription feed |
| Overview | the dashboard home page's ten-query summary, in one call |
| Feedback, health, ping, landing page | (already covered) |

**Superadmin console (7 routes) is the one deliberate gap.** Lower traffic,
separate token space already built (`@SuperAdminOnly()`), and porting it
doesn't block anything a vendor or shopper does.

**The staff list is intentionally not Owner-only**, unlike every other staff
mutation. "Manage bookings" (Owner AND Management, per spec §7.4) means
assigning a booking to a staff member, which means reading this list — the
dashboard's booking-assignment dropdown is the caller. The old Next.js
version sidestepped this entirely by querying Prisma directly from the
bookings page, bypassing whatever the `/api/staff` route's own role check
said. Funneling everything through one guarded endpoint surfaced that
inconsistency; `@Roles("Owner", "Management")` on the GET only (mutations
stay Owner-only) is the fix, not a workaround.

Also ported for this pass: `backend/public/fonts/*.woff` — `lib/fonts.ts`
reads these off disk for Satori, and they weren't in the backend at all
until now. `backend/Dockerfile` copies `public/` into the runtime image
alongside `dist/`.

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
