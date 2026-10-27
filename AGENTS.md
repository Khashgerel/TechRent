<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TechRent

Three-sided marketplace for construction equipment in Mongolia: equipment owners,
operators, and corporate clients, plus an admin console. Built as an investor
demo — real database and real state machines, simulated money.

## Commands

- `npm run db:start` — start the local Postgres (Prisma's bundled server). It must
  stay running in its own terminal; if the shell that launched it exits, the
  server is reaped and every query fails with `ECONNREFUSED` or `P1017`. The named
  server keeps its ports (51214 / 51215) across restarts, so `.env` stays valid.
  To keep it alive independently of any shell:
  `Start-Process cmd -ArgumentList "/c npx prisma dev -n techrent" -WindowStyle Hidden`
- `npm run db:reset` — migrate + reseed to a known demo state
- `npm run dev` — dev server on :3000
- `npm run typecheck` / `npm run lint` / `npm run test`
- `npm run check:messages` — fails if the mn/en catalogs drift apart

## Conventions

- **Money** is whole MNT in `Int` columns. Never floats. Format via `lib/money.ts`.
- **Balances** are derived by summing `LedgerEntry` rows, never stored. Every
  `LedgerTransaction` must have entries summing to zero.
- **i18n**: all user-facing copy lives in `messages/{mn,en}.json`. Mongolian is the
  default locale. Add keys to both files — `check:messages` enforces it.
- **Notifications** store a `type` + `data` payload and are translated at render
  time, so they are language-agnostic in storage.
- **Auth** is a signed JWT cookie (`lib/auth/session.ts`), not Auth.js. Google/Facebook sign-in is hand-rolled in `lib/auth/oauth.ts` and stores
  no provider tokens. The proxy
  does an optimistic cookie-presence check; real enforcement is in server
  components and actions via `lib/auth/guards.ts`.
- **Roles** are a set, not a column: `User.roles` is what an account may act
  as and `User.activeRole` is what it is looking at. Guard with
  `requireRole`, which asks whether a role is *held* — never compare
  `session.role` with `===`. On a booking, what someone may do comes from
  what they *are on that booking* (company, owner, operator), not from the
  session; see `fireBookingEvent`.
- Prisma 7 generates into `lib/generated/prisma` (gitignored) and needs a driver
  adapter — see `lib/db.ts`, which wraps `pool.query` with the retry policy in
  `lib/db-retry.ts` so a dropped connection is retried instead of 500-ing.
  Transactions are deliberately not retried — replaying half a transaction is
  worse than failing.
- Never write logs or scratch files into `.next/` — `next build` cleans that
  directory and fails with `EBUSY` if something else holds a file there.
- **`next build` must not need the database.** Any page reading live rows has to
  opt out of prerendering (`export const dynamic = "force-dynamic"`), otherwise
  the build fails wherever the database isn't reachable.
- **Booking money** moves only through `lib/escrow/booking.ts`. `planTransition`
  is pure and decides which ledger entries a transition posts; `lib/escrow/service.ts`
  applies them and the status change in one database transaction.
