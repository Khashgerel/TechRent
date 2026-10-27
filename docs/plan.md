# TechRent — build plan

The plan agreed on 2026-08-21, kept here so it survives between sessions. The
approved scope and phase order are unchanged; the **Status** and **Deviations**
sections at the end record where the code has moved on from it.

## Context

TechRent is a three-sided marketplace for Mongolia's construction equipment
market: equipment owners with idle machinery, independent operators looking for
work, and companies that need both on short notice. The decks define four core
systems (smart matching, two-way ratings, escrow payments, booking calendar),
two service modules (Operator Academy, parts & service store), and a four-step
operational flow: **register → order → completion → payout**.

What existed at the start was `index.html` — a 1,559-line single-file static
mockup in Mongolian, now kept as [docs/prototype.html](prototype.html).

**Goal:** a genuinely functional web application — real database, real auth,
real booking and escrow state machines — built and polished as an
**investor/sales demo**. Money movement is simulated against a real double-entry
ledger rather than live bank rails, so the payment integration can be swapped in
later without redesigning anything around it.

### Decisions locked with the user

| Area | Decision |
|---|---|
| Purpose | Investor/sales demo — persistent, believable, walkthrough-ready |
| Stack | Next.js (App Router) + TypeScript + Postgres + Prisma |
| Payments | Simulated escrow ledger behind a swappable provider interface |
| Auth | Phone number + SMS OTP; codes shown in-app in demo mode, no SMS gateway needed |
| Modules | All four roles **plus** Academy, map matching, analytics, parts store |
| Language | Mongolian default, English toggle |
| Hosting | Vercel + hosted Postgres (Neon), shareable public URL |
| Design | Modern refresh keeping TechRent's blue `#1a56db` / amber `#f59e0b` identity |
| Assets | All generated — logo, imagery, realistic Mongolian seed data |

## Architecture

**Framework** — Next.js App Router with React Server Components for reads and
Server Actions for mutations. No separate API server; route handlers only where
genuinely needed (OTP, webhooks, uploads).

**Stack choices**

- **UI:** Tailwind CSS, brand tokens ported from the prototype's `:root` block
- **DB:** Postgres via Prisma (local Prisma dev server; Neon when hosted)
- **Auth:** phone + OTP, signed JWT session cookie
- **i18n:** `next-intl`, locale-prefixed routes `/[locale]/...`, `mn` default
- **Maps:** Leaflet + OpenStreetMap tiles — no API key, no billing account for a demo
- **Charts:** Recharts
- **Forms:** react-hook-form + Zod, schemas shared between client and Server Actions

**Directory shape**

```
app/[locale]/(auth)/login, verify
app/[locale]/(dashboard)/owner/...     equipment, calendar, bookings, earnings
app/[locale]/(dashboard)/operator/...  profile, jobs, academy, income
app/[locale]/(dashboard)/company/...   search, orders, progress, reviews
app/[locale]/(dashboard)/admin/...     dashboard, users, transactions, academy, store, settings
app/[locale]/(dashboard)/store/...     shared parts & service store
lib/matching/                scoring engine (pure functions)
lib/escrow/                  ledger + booking state machine
lib/store/                   catalogue, cart pricing, purchase ledger plan
lib/auth/                    OTP issue/verify, session, role guards
prisma/schema.prisma, prisma/seed.ts, prisma/seed/*
messages/mn.json, messages/en.json
```

## Data model (Prisma)

- **User** — phone (unique), name, role, locale, avatar, `verifiedAt`. One role
  per account keeps the demo's mental model clean; profile detail lives in
  `OwnerProfile` / `OperatorProfile` / `CompanyProfile`.
- **OtpCode** — phone, code, `expiresAt`, `consumedAt`. Real table, real expiry,
  real single-use.
- **Equipment** — owner, category enum, make/model/year, hourly + daily +
  monthly rates, location (lat/lng + aimag/district), status, photos,
  `specs Json`.
- **AvailabilityBlock** — owner-declared unavailable ranges; bookings also
  occupy the calendar.
- **Order** — company, requirements, date range, location, `needsOperator`,
  budget, status enum.
- **Match** — order × equipment × operator, with `score` and a `breakdown Json`
  so the UI can show *why* something matched.
- **Booking** — the accepted match; carries the amounts and drives the escrow
  state machine.
- **Account** + **LedgerTransaction** + **LedgerEntry** — double-entry: every
  hold, release, commission, payout and refund is a balanced group of rows.
  Balances are derived, never stored as a mutable number.
- **Review** — two-way, per booking, with subscores (punctuality, quality,
  equipment care). Feeds operator points and equipment ratings.
- **Notification** — typed, per-user, with deep link, translated at render time.
- **Academy** — `Course → Lesson → QuizQuestion`, plus `Enrollment`,
  `QuizAttempt`, `Certificate`. Certificates raise operator level, which unlocks
  higher-tier jobs.
- **Store** — `Part` (SKU, stock, compatibility), `ServiceRequest`, `StoreOrder`
  + items.
- **PlatformSettings** — commission rate, deposit percentage, level thresholds.
  Admin-editable, read by the escrow and matching logic.

## The two pieces of real logic

Everything else is CRUD and presentation. These two carry the product's actual
claims, so they are built as pure, tested modules rather than scattered through
components.

**Matching engine** (`lib/matching/`) — scores candidates on haversine distance,
category fit, skill overlap, price-vs-budget, rating, and calendar availability.
Weighted, deterministic, and **explainable**: it returns a breakdown the UI
renders as "94% match — 12km away, certified on CAT 320, available your full
window." That explanation is what makes it read as intelligent in a demo rather
than as a random number.

**Escrow ledger** (`lib/escrow/`) — a booking state machine emitting balanced
ledger entries at each transition: hold deposit on confirmation, hold balance on
start, on verified completion release to owner and operator minus platform
commission. `planTransition` is pure; `lib/escrow/service.ts` applies the plan
and the status change in one database transaction.

## Build phases

Each phase ends at something runnable, so the build can be redirected early
rather than at the end.

- **Phase 0 — Foundation.** Scaffold, brand theme, full Prisma schema, seed
  script, i18n wiring, phone-OTP auth with dev code display, app shell, `/demo`
  one-click login as each seeded persona.
- **Phase 1 — Owner module.** Equipment CRUD with photo upload, availability
  calendar, incoming booking requests, earnings, utilization and revenue charts.
- **Phase 2 — Company module + matching.** Search with filters, map view, order
  creation wizard, matching engine run, ranked offers with score breakdowns.
- **Phase 3 — Bookings, escrow, operator module, reviews.** Full lifecycle from
  offer acceptance to payout. Operator profile, job offers, points and levels,
  income. Two-way reviews. Notifications on every state change.
- **Phase 4 — Operator Academy.** Course catalogue, lessons, quiz-based
  certification, certificates that raise operator level.
- **Phase 5 — Parts & service store.** Catalogue, compatibility filtering, cart
  and checkout through the same ledger, service requests routed to admin.
- **Phase 6 — Admin console.** Platform metrics, user verification queue,
  transaction ledger with commission reporting, Academy content management,
  store management, settings.
- **Phase 7 — Demo polish & deploy.** Coherent narrative dataset, generated logo
  and equipment imagery, empty/loading/error states, mobile pass, deploy to
  Vercel + Neon, written walkthrough script.

## Verification

- `npm run db:reset` — wipes, migrates, and reseeds to a known demo state before
  any presentation.
- **End-to-end demo path**, exercised after each phase that touches it: log in
  as company → create an order → review ranked matches → accept an offer → log
  in as owner and confirm → log in as operator and complete → company verifies →
  check the ledger shows deposit held, commission taken, owner and operator paid
  → both sides leave reviews → confirm the operator's points and level moved.
- **Unit tests (Vitest)** on the logic modules only: matching scores and
  ordering, ledger balance invariants across every booking transition including
  cancellation and refund, quiz grading, and store cart pricing.
- **Manual pass** on each screen in both `mn` and `en`, and at mobile width.
- Post-deploy: load the Vercel URL on a phone and walk the same path against the
  hosted database.

## Scope note

Demo-grade means each screen is real and complete but not hardened: no KYC, no
rate limiting, no production payment rails, no load testing. Those are the
deltas between this and a production launch, and none of them require rework of
what is built here.

## Status — 2026-08-24

| Phase | State |
|---|---|
| 0 Foundation | done |
| 1 Owner | done |
| 2 Company + matching | done |
| 3 Bookings / escrow / operator / reviews | done |
| 4 Operator Academy | done |
| 5 Parts & service store | done |
| 6 Admin console | done |
| 7 Demo polish & deploy | done — live at https://tech-rent-khashgerel-nomuungerels-projects.vercel.app |

Phase 7 in detail:

- Loading skeletons, an error boundary with retry, a locale-aware 404 and a
  root `global-error` — every dashboard route is covered.
- Mobile pass at 375px across the dense screens (admin dashboard, users,
  transactions, store management, parts catalogue, equipment search including
  the map): no horizontal overflow, sidebar collapses to a drawer.
- `next build` verified against an unreachable database — every page that reads
  live rows is server-rendered on demand, so a deploy can build before its
  database exists. `postinstall: prisma generate` added so the client is
  generated on a clean install.
- [docs/walkthrough.md](walkthrough.md) — the presenter's script.
- [docs/deploy.md](deploy.md) — Neon + Vercel steps, environment variables, and
  post-deploy checks.
- Deployed 2026-08-25: Neon holds the seeded demo state, the three environment
  variables are set on the Vercel project, `vercel.json` pins the Next.js
  framework preset, and deployment protection is off so the URL can be shared.

## Deviations from the plan as written

Decided while building; the plan text above is left as approved.

- **Auth** is a hand-rolled signed JWT cookie (`lib/auth/session.ts`) rather than
  Auth.js v5. The proxy does an optimistic cookie-presence check; real
  enforcement lives in server components and actions via `lib/auth/guards.ts`.
- **UI primitives** are hand-written in `components/ui` on Tailwind v4 instead of
  shadcn/ui, so the brand tokens from the prototype carry through unmediated.
- **Routing** puts every role under one `(dashboard)` route group rather than a
  group per role, because they share the same shell.
- **Wallets** are `Account` rows (`kind = USER_WALLET`) rather than a separate
  `Wallet` model — one account table keeps the ledger's foreign keys uniform.
- **Prisma 7** generates into `lib/generated/prisma` (gitignored) and needs a
  driver adapter; `lib/db.ts` wraps `pool.query` with the retry policy in
  `lib/db-retry.ts`.
- **Store purchases** post to platform revenue rather than to a supplier wallet —
  the store is the platform's own inventory in this demo.
- **Academy management** in the admin console is publish/unpublish plus
  enrolment and certificate figures, not full lesson-and-quiz authoring. Course
  content is authored in `prisma/seed/academy.ts`, which is the right place for
  a demo whose dataset is meant to be reproducible.
- **Every admin action writes an `AuditLog` row** in the same transaction as the
  change, and the console reads that trail back on the dashboard and the
  settings page.

## What came next

A client requirements spreadsheet arrived on 2026-10-27 with 51 features
(A01–G08). The gap analysis against this build, and the phases that close it,
live in [docs/requirements-plan.md](requirements-plan.md). The seven phases above
are unchanged and remain the record of how the demo was built.
