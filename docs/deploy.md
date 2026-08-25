# Deploying the demo

Target: **Vercel** for the app, **Neon** for Postgres. The result is a public
URL that can be handed to an investor and opened on a phone.

The build does not need a database — every page that reads live rows is
server-rendered on demand — so a broken `DATABASE_URL` fails at request time,
not at build time. Verified with:

```bash
DATABASE_URL="postgresql://nobody@127.0.0.1:1/nodb" npx next build
```

## 1. Database

Create a Neon project and copy the **pooled** connection string (it has
`-pooler` in the host). Pooled is what the app wants: `lib/db.ts` runs a `pg`
pool through Prisma's driver adapter.

Apply the schema and load the demo data from your machine, pointed at Neon:

```bash
DATABASE_URL="<neon-pooled-url>" npx prisma migrate deploy
DATABASE_URL="<neon-pooled-url>" npm run db:seed
```

`migrate deploy` applies migrations without prompting and without dropping
anything — it is the production-safe counterpart to `db:reset`. The seed takes
around 25 minutes against a remote database and prints nothing until it ends.

## 2. Environment variables

Set these in Vercel (Production and Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Neon **pooled** connection string |
| `SESSION_SECRET` | 32+ random bytes — `openssl rand -base64 32` |
| `DEMO_MODE` | `true` — shows OTP codes in the UI instead of sending SMS |

`SESSION_SECRET` signs the session cookie (`lib/auth/session.ts`). Changing it
invalidates every existing session, which is a fine way to sign everyone out.

Keep `DEMO_MODE=true` for anything investor-facing: without it, sign-in needs an
SMS gateway that does not exist yet.

## 3. Deploy

Import the repository in Vercel. Framework preset: **Next.js**. Build command
and output directory are the defaults; `prisma generate` runs from the
`postinstall` hook, so no custom build command is needed.

After the first deploy, open `/mn/demo` and sign in as each persona once — that
exercises the pooled connection and warms the routes.

## 4. Post-deploy checks

- `/mn/demo` lists four personas.
- Sign in as the client, create an order, and confirm ranked offers appear —
  this proves the matching engine and the write path.
- Open `/mn/admin/transactions` and confirm the ledger renders.
- Load the same URL on a phone and walk the booking flow at that width.
- Toggle to English somewhere deep in the app; the layout should not shift.

## Notes

- **The seed is destructive.** `prisma/seed.ts` wipes every table before it
  writes. Never point it at anything you are not prepared to lose, and prefer
  `migrate deploy` + `db:seed` over `db:reset` for a hosted database.
- **Sessions survive a reseed but their users do not.** A reseed issues new user
  ids, so old cookies point at rows that no longer exist. The session guard
  detects this and sends the visitor back to sign in.
- **Connection drops are retried.** `lib/db-retry.ts` wraps `pool.query`, so a
  dropped Neon connection is retried rather than 500-ing. Transactions are
  deliberately not retried.
- **Costs.** Neon's free tier is enough for this dataset (roughly 3,500 rows).
  Vercel's hobby tier serves the app fine; every page is dynamic, so there is no
  ISR cache to think about.
