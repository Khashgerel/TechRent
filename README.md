# TechRent

A three-sided marketplace for Mongolia's construction equipment market:
equipment owners with idle machinery, independent operators looking for work,
and companies that need both on short notice — plus an admin console.

Built as an investor demo: real database, real auth, real booking and escrow
state machines. Money is simulated against a double-entry ledger behind a
swappable payment provider, so the accounting is exact without a payment
gateway attached.

**Live demo:** https://tech-rent-khashgerel-nomuungerels-projects.vercel.app

- **Plan and status** — [docs/plan.md](docs/plan.md)
- **Demo script** — [docs/walkthrough.md](docs/walkthrough.md)
- **Deploying** — [docs/deploy.md](docs/deploy.md)
- **Original static mockup** — [docs/prototype.html](docs/prototype.html)

## Running it locally

```bash
npm install
npm run db:start
```

`db:start` runs Prisma's bundled Postgres and **must stay in its own terminal** —
if the shell that launched it exits, the server is reaped and every query fails.
It prints the connection string; put that in `.env` as `DATABASE_URL`, alongside
a `SESSION_SECRET` (`openssl rand -base64 32`) and `DEMO_MODE="true"`.

> **Check what `DATABASE_URL` points at before running anything that writes.**
> If it holds the Neon string, `db:reset` and `db:seed` wipe the live demo
> database rather than a local one — they drop every table first, by design.

Then, in a second terminal:

```bash
npm run db:reset   # migrate + seed to a known demo state (~25 minutes)
npm run dev
```

Open http://localhost:3000/mn/demo and sign in as any of the four personas.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run db:start` / `db:stop` | Local Postgres (keeps its ports across restarts) |
| `npm run db:reset` | Migrate and reseed to the demo state |
| `npm run db:seed` | Reseed only — still wipes every table first |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest — matching, ledger, quiz grading, cart pricing |
| `npm run check:messages` | Fails if the `mn` and `en` catalogs drift apart |

## How it fits together

**Next.js App Router** with server components for reads and server actions for
writes; no separate API. **Prisma 7** on Postgres through a driver adapter
(`lib/db.ts`), with a retry policy for dropped connections. **next-intl** with
locale-prefixed routes, Mongolian by default. Auth is a signed JWT cookie, not
Auth.js.

Two modules carry the product's actual claims and are unit-tested in isolation:

- **`lib/matching/`** — scores candidate machines and operators on distance,
  category fit, skill overlap, price against budget, rating and calendar
  availability, and returns the breakdown so the UI can explain the score.
- **`lib/escrow/`** — the booking state machine. `planTransition` is pure and
  decides which ledger entries a transition posts; `lib/escrow/service.ts`
  applies them and the status change in one database transaction.

Every balance in the app is summed from `LedgerEntry` rows. None are stored.

See [AGENTS.md](AGENTS.md) for the conventions that matter when changing code
here — money handling, i18n, notifications, and what the build is not allowed to
depend on.
