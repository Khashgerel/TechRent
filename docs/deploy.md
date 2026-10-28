# Deploying the demo

Target: **Vercel** for the app, **Neon** for Postgres. The result is a public
URL that can be handed to an investor and opened on a phone.

**Live:** https://tech-rent-khashgerel-nomuungerels-projects.vercel.app —
Vercel project `tech-rent`, Neon project `TechRent`
(`rough-sun-98586697`, ap-southeast-1), auto-deploying from `main`.

> **The Neon database is the demo.** `.env` in this repo points at that same
> Neon instance, not at a local Postgres, so `npm run db:reset` and
> `npm run db:seed` run against production and wipe it. Point `DATABASE_URL` at
> the local server from `npm run db:start` before running either.

The build does not need a database — every page that reads live rows is
server-rendered on demand — so a broken `DATABASE_URL` fails at request time,
not at build time. Verified with:

```bash
DATABASE_URL="postgresql://nobody@127.0.0.1:1/nodb" npx next build
```

## 1. Database

Already done for the project above: the Neon database holds the full seeded
demo state (48 accounts, 51 machines, 287 bookings, 2,684 ledger entries, the
Academy content, the parts catalogue). The rest of this section is what to do
for a *new* environment.

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

The first three are set on the `tech-rent` project for Production, Preview and
Development. For a new environment:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Neon **pooled** connection string |
| `SESSION_SECRET` | 32+ random bytes — `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional. Enables Google sign-in |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Optional. Enables Facebook sign-in |
| `OAUTH_BASE_URL` | Optional. Overrides the callback origin — only needed behind a tunnel |

`SESSION_SECRET` signs the session cookie (`lib/auth/session.ts`). Changing it
invalidates every existing session, which is a fine way to sign everyone out.

Demo mode and phone sign-in were removed in the auth rework
(`docs/auth-rework-plan.md`). The only ways in are a social provider for
marketplace accounts and `/[locale]/staff-login` for staff. **No staff password
is ever seeded** — `npm run admin:create` is the only thing that sets one, so a
fresh environment needs it run before anyone can sign in as staff.

The seeded accounts have no email and no linked social identity, so they are
reachable **only** by staff impersonation from the admin user list. That is
deliberate, and it is why staff sign-in shipped before any of this was removed.

## 3. Deploy

Import the repository in Vercel and let it build from `main`. Two settings are
worth knowing because both have already bitten this project:

- **Framework preset.** [vercel.json](../vercel.json) pins `"framework":
  "nextjs"`. Without it a project created for a static site looks for a `public`
  output directory that a Next.js build never produces, and fails after
  compiling successfully.
- **Prisma client.** `postinstall: prisma generate` in `package.json` is what
  makes a clean install work — `lib/generated/` is gitignored, so without the
  hook the build dies on `Can't resolve '@/lib/generated/prisma/client'`.

**Deployment protection** is off, which is what makes the URL shareable. Note
what that means: `/mn/demo` signs anyone in as any persona in one click,
including the admin, who can change the commission rate, verify accounts and
cancel orders. The data is fictional; the controls are real. Turn Vercel
Authentication back on in Project Settings → Deployment Protection when the demo
period is over.

After a deploy, open `/mn/demo` and sign in as each persona once — that
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

## Social sign-in

Google and Facebook sign-in ships dormant: `lib/auth/oauth.ts` renders a button
only for a provider that has **both** halves of its credential set, so with no
variables there is nothing to see and nothing to break.

**This project has two production URLs**, and both serve the app:

- `tech-rent-hazel.vercel.app` — the project's production domain
- `tech-rent-khashgerel-nomuungerels-projects.vercel.app` — the team alias

The origin is taken from `OAUTH_BASE_URL`, else `VERCEL_PROJECT_PRODUCTION_URL`,
else the request host. Left to Vercel it would resolve to the first of those,
which is *not* the URL the demo is usually shared as — so `OAUTH_BASE_URL` is
set explicitly to pin it:

```
OAUTH_BASE_URL = https://tech-rent-hazel.vercel.app
```

Register exactly these, character for character and with no trailing slash — a
mismatch is the single most common cause of a failed sign-in, and it fails the
same way every time (`redirect_uri_mismatch`):

```
https://tech-rent-hazel.vercel.app/api/auth/google/callback
https://tech-rent-hazel.vercel.app/api/auth/facebook/callback
```

Change `OAUTH_BASE_URL` and the registered URIs together, never one alone.

A Google consent screen starts in **Testing** mode, where only the emails added
as test users can sign in — useful if the demo should stay invitation-only, and
**Publish app** opens it to anyone. An app asking only for email and profile,
as this one does, needs no verification review.

Two things worth knowing before pointing anyone at Facebook. A Facebook app
stays in development mode until it passes review, during which only its own
admins, developers and testers can sign in; and Facebook returns no email when
the account has none verified or the person declines the permission, in which
case the account is created without one and cannot be matched to an existing
account by email later.

Signing in opens an account that holds the **client** role only, with no profile
and nothing else asked for. The company details are collected at
`/[locale]/company/profile` the first time an order is started, and saving that
form is also what grants the client role to an account that did not already hold
it. No provider token is stored — the provider is asked who the visitor is once
and never called again.
