# Auth rework — staged plan (2026-10-28)

## Context

Four changes were asked for, in Mongolian:

1. **Demo горимыг устга** — remove demo mode: the one-click persona picker at
   `/[locale]/demo` and the `DEMO_PASSWORD` gate in front of it.
2. **Client бүрт техник эзэмшигч, оператор эрхийг нэгтгэ** — a client account
   should be able to hold the owner and operator roles too.
3. **Нэмэлт форм бөглөх** — but each extra role is earned by filling that
   section's own form. A Google sign-up starts client-only; "Оператор болох" or
   "Техник эзэмшигч болох" opens the matching form.
4. **Систем админ … тусдаа Login page** — staff sign in on their own page with a
   username and password.

Multi-role already exists (`User.roles` + `activeRole`, `requireRole` asks what
is *held*), and the profile-gate pattern from `lib/company/profile-actions.ts`
already does exactly what point 3 describes for the client role. So this is
mostly extension — except for point 4, which introduces the first password in a
system that has never had one, and point 1, which removes the only way into the
deployed demo.

### The load-bearing fact

**The 48 seeded accounts have no email address.** The seed never sets one. They
therefore cannot be matched by a Google sign-in, and once phone + OTP goes there
is **no other way to reach them — permanently**. Everything below is shaped by
that: the persona picker is not deleted so much as *moved* behind staff
authentication.

## Decisions

Settled by interview before any code was written.

| # | Decision |
|---|---|
| 1 | Admin **impersonation** replaces the persona picker, inside the admin console |
| 2 | Roles are a **capability**: no account is granted a role it didn't fill a form for |
| 3 | Saving a role form **grants the role immediately**, flagged unverified |
| 4 | `username` + scrypt `passwordHash` on `User` — no new dependency |
| 5 | `ADMIN` is **staff-only**: never alongside marketplace roles, never reachable from a Google sign-in |
| 6 | Phone + OTP is **deleted entirely** — it cannot work without an SMS gateway |
| 7 | Impersonation grants **full access**, with a banner, one-click exit, an `AuditLog` row, and no staff-on-staff |
| 8 | The role forms collect **fields now, documents later** (A03/A04 build those) |
| 9 | Unverified owners' equipment stays `PENDING_REVIEW`; unverified operators are **not** excluded from matching |
| 10 | `/admin/login` is **non-localised and unlinked**, throttled per username and per IP, with a deliberately vague error |
| 11 | `npm run admin:create` sets the first password — **never** a password in the repo, the seed, or an env var |
| 12 | "Become…" buttons live on an account page, plus a contextual prompt in the owner/operator areas |
| 13 | **Staged delivery**, so the new doors are proven before the old ones close |
| 14 | An impersonated session lasts **one hour** |
| 15 | The **equipment approval queue** is in scope — `PENDING_REVIEW` currently has nothing that can approve it |
| 16 | Батболд Дорж keeps the three roles granted by hand, as a ready-made illustration |
| 17 | The seed is **updated but not run** — a reseed wipes production and takes ~25 minutes |
| 18 | **Three stages**, demolition last |

Implementation choices not worth interviewing over: route names, the session
payload carrying the impersonator's id, scrypt parameters, and **DB-backed**
login throttling — in-memory counters are useless on Vercel, where consecutive
requests may hit different lambdas.

## Stage 1 — the new door  ✅ deployed 2026-10-28

Nothing is removed. Demo mode keeps working throughout, as the fallback.

- `username` (unique, nullable) and `passwordHash` (nullable) on `User`; a table
  to count failed sign-in attempts.
- `lib/auth/password.ts` — scrypt hash and constant-time verify, pure and tested.
- `lib/auth/throttle.ts` — attempt counting per username and per IP, pure
  decision logic with the storage passed in.
- `/admin/login`, non-localised, linked from nowhere, one vague error for every
  failure mode so usernames can't be discovered.
- `npm run admin:create` — prompts for username and password, writes the hash,
  refuses to print it back.
- `ADMIN` becomes staff-only: enforced on the model, in the OAuth path, and in
  the guards.
- Impersonation: start from the admin console, a banner naming who you really
  are, one-click exit, an `AuditLog` row on entry, one-hour lifetime, and a
  refusal to impersonate another staff account.

*Done when:* you sign in at `/admin/login` with a password you set, impersonate
Батболд from the console, act as him, and leave again — with the demo picker
still sitting there untouched.

## Stage 2 — the new on-ramps  ✅ deployed 2026-10-28

Still nothing removed.

- `/[locale]/account` — the roles this account holds, and what it could add.
- "Техник эзэмшигч болох" → owner form (company name, registration number,
  province/district, bio) → grants `OWNER`, unverified.
- "Оператор болох" → operator form (years of experience, machine categories, day
  rate, province/district, availability, bio) → grants `OPERATOR`, unverified.
- A contextual prompt where a client opens an owner or operator area, rather
  than a dead end — the same shape as the company-profile gate already live.
- New owners' equipment lands in `PENDING_REVIEW`; the admin console gets the
  queue that approves it.

*Done when:* a fresh Google account becomes an owner and an operator by filling
two forms, and an admin approves its first machine.

## Stage 3 — the demolition  — built, not deployed

The irreversible one.

- Delete `/[locale]/demo`, the picker, `demoLoginAction`, `lib/auth/demo-gate.ts`.
- Delete phone + OTP: `lib/auth/otp.ts`, `/login`'s phone form, `/verify`, and
  the `OtpCode` table.
- Remove `DEMO_MODE` and `DEMO_PASSWORD` from Vercel.
- Rewrite `prisma/seed.ts` to produce a world that obeys these rules — a staff
  account with a username and no password, personas holding only roles they'd
  have earned. **Updated, not run.**
- Rewrite `docs/walkthrough.md` around impersonation instead of the picker.

*Done when:* the only doors are Google and `/admin/login`, and the seeded data
is still reachable through impersonation.

## Risks

- **Seeded accounts become impersonation-only, permanently.** No email, no
  linked identity, and after stage 3 no phone. If impersonation breaks, 48
  accounts and 287 bookings are unreachable. This is why it ships first and
  alone.
- **Stage 3 cannot be walked back casually.** Restoring phone login means
  acquiring the SMS gateway that never existed.
- **Two migrations against Neon**, which is also what `.env` points at. Each one
  briefly disagrees with the running code, so each is pushed first and applied
  the moment the new build reports ready — as the last one was.
- **A password on a public URL.** Hence throttling, a vague error, no default
  password anywhere, and `admin:create` never echoing what it wrote.

## Verification

Per stage: `npm run typecheck`, `npm run lint`, `npm run test`,
`npm run check:messages`, and `next build` against an unreachable database.

New pure modules get tests alongside, following the existing pattern: scrypt
hash/verify round-trip and rejection, throttle decisions at and past the limit,
the staff-only role invariant, and the impersonated session's shape.

Manual, in both `mn` and `en` and at 375px: the admin login's failure modes, the
impersonation banner and exit, each role form, and the approval queue.
