# TechRent — demo walkthrough

A presenter's script for the investor demo. It follows the four-step flow from
the deck — **register → order → completion → payout** — and then shows the two
service modules and the admin console. Twelve to fifteen minutes at a normal
pace; the optional stops are marked.

Everything below runs against real database rows and real state machines. The
only thing simulated is the bank: money moves through a double-entry ledger
behind a swappable `PaymentProvider`, so the numbers are exact even though no
payment gateway is connected.

## Before you present

```bash
npm run db:start
```

Leave that terminal open — the local Postgres dies with the shell that started
it. Then, in a second terminal:

```bash
npm run db:reset
```

That migrates and reseeds to a known state. **It takes about 25 minutes and
prints nothing until it finishes**, so run it well before anyone is watching,
not five minutes prior. Then:

```bash
npm run dev
```

There is no demo picker any more, so you need a staff account before you can
show anything:

```bash
npm run admin:create
```

It prints which database it is about to touch, then asks for a username,
display name and password. Nothing else in the project can set a staff
password, and none is ever seeded.

Open `http://localhost:3000/mn/staff-login`, sign in, and leave the admin
console on screen. Mongolian is the default; the toggle at the top right
switches to English — worth flipping once early so the room knows it is there.

## The setup line

> "TechRent connects three groups that already exist in Mongolia's construction
> market but have no way to find each other quickly: owners with idle machinery,
> operators looking for work, and companies that need both on short notice.
> Everything you're about to see is a working application against a real
> database — the money is simulated, nothing else is."

---

## Step 1 — Register

**Screen:** `/mn/login`

Sign-in is Google (and Facebook once its app is approved). Signing up asks for
nothing beyond what the provider returns.

> "Anyone can sign up in one click. We ask for nothing up front — no forms, no
> documents. You arrive as a client and you can search immediately."

**Then show how a role is earned.** Open **Миний бүртгэл / Account**. A new
account holds the client role and is offered two more.

> "If you own machines, or you operate them, you say so here and fill in that
> section's form. The role is granted straight away — but the account is marked
> unverified, and that matters in a moment."

Open **Техник эзэмшигч болох**, fill it in, and point out the sidebar growing a
whole new section.

**Then the review half** — go back to the admin console and open
**Хэрэглэгчид / Users**. Accounts are sitting in the verification queue with
their business registration details. Open **Техник хянах / Equipment review**
too: machines listed by unverified owners wait here before they can be found.

> "New accounts don't go live on their own. An administrator checks the company
> registration number and approves them — that's the queue."

Verify one. Note the badge flip and that the account holder is notified.

### Moving between accounts

The rest of this script hops between an owner, an operator and a client. From
**Хэрэглэгчид / Users**, the **Нэвтрэх** button on any account signs you in as
them — an amber banner across the top says whose account you are in and who you
really are, and **Админ руу буцах** brings you back. Every hop is written to the
audit trail, and staff accounts cannot be impersonated.

> "This is how we support customers — and how I'm about to show you three sides
> of the same transaction without juggling three logins."

Mention, if asked: the seeded accounts have no email and no password of their
own, so this is the only way into them. That is deliberate.

## Step 2 — Order

**Sign in as** Оюунчимэг Батаа (**Захиалагч / Client**, Мон Барилга ХХК).

1. **Search** (`/mn/company`) — filters by category, province, price and dates,
   with a map view of everything available across Mongolia. Toggle the map once.
2. **New order** (`/mn/company/orders/new`) — fill in a job: category, dates,
   location, whether an operator is needed, and a budget range.
3. On submit the matching engine runs immediately and you land on ranked offers.

This is the moment to slow down. Open one offer's score breakdown:

> "Ninety-four percent isn't a made-up number. The engine scores distance,
> category fit, whether the operator is certified on that machine, price against
> the stated budget, rating, and whether the calendar is actually free — and it
> hands back the reasons, which is what you're reading here."

Accept the best offer. That creates the booking **and moves the deposit into
escrow** — say so as you click, because it is the first money movement.

## Step 3 — Completion

Three accounts, quick hops. Impersonate each from **Хэрэглэгчид / Users**,
and use **Админ руу буцах** between them.

1. **Owner** (Батболд Дорж) → **Захиалга / Bookings**: the new request is
   waiting. Confirm it.
2. **Operator** (Ганзориг Батаа) → **Ажлын санал / Job offers**: start the job,
   then complete it. Starting the job pulls the remaining balance into escrow.
3. **Client** again → **Явц / Job progress**: verify the completed work.

> "Nobody gets paid because the operator says they're finished. The client
> verifies — that's the release trigger."

## Step 4 — Payout

Stay on the booking after verifying. The escrow panel shows the split: platform
commission taken, the owner paid, the operator paid.

Then leave the two-way review — punctuality, quality, equipment care — and point
out the operator's points moving, which is what feeds their level.

**Then switch to the admin** and open **Гүйлгээ / Transactions**. Filter to
*Тооцоо хийсэн / Released* and find the booking you just verified.

> "Every movement is double-entry. This transaction has the escrow account
> debited and three accounts credited — owner, operator, platform — and it sums
> to zero, like every other transaction in here. Balances are never stored; they
> are always summed from these rows. That's what makes it auditable when the
> real payment rails go in."

---

## The two service modules

**Operator Academy** — sign in as the operator, open **Академи**. Take a course:
lessons, then a quiz graded server-side. Passing issues a certificate, awards
points and can raise the operator's level.

> "This closes the loop: training raises level, level unlocks higher-tier jobs,
> and the matching engine reads that level when it scores candidates. It isn't a
> separate content library — it feeds the marketplace."

**Parts & service store** — open **Сэлбэгийн дэлгүүр** from any role. Filter
parts by the machine they fit, add to the cart, check out. The purchase clears
through the same ledger, and stock decrements.

Then raise a **service request** — that lands in the admin's queue, where it is
scheduled and closed.

## The admin console

`/mn/admin`, as Системийн админ:

- **Overview** — booking volume, commission earned, money currently held in
  escrow, store sales, and the three queues that need attention.
- **Transactions** — the full ledger with per-entry detail and commission by
  month.
- **Academy content** — publish or unpublish courses; enrolment and certificate
  counts per course.
- **Store** — the service queue, parts orders (including cancel-with-refund,
  which puts stock back and returns the money), and inventory.
- **Settings** — commission rate, deposit percentage, operator share, level
  thresholds.

The settings page is a good closer:

> "Change the commission here and the next booking quotes at the new rate — the
> matching engine and the escrow planner read these values at runtime. Every
> change on these screens is written to an audit log with who did it."

---

## Questions you should expect

**"Is the money real?"** No. Every movement posts to a double-entry ledger, and
the ledger is the part that would stay when a payment provider is connected. The
provider interface has one implementation today, a mock; QPay or a bank slots in
behind it without changing anything above it.

**"What happens if a booking is cancelled?"** Escrow refunds whatever it is
holding at that point in the lifecycle — deposit only before the job starts, the
full amount after. Show it if asked: the transition rules are tested.

**"How does the matching actually score?"** Distance by haversine, category fit,
operator skill overlap, price against budget, rating, and calendar availability,
weighted and deterministic. Same inputs, same answer, every time.

**"Could we run this in production tomorrow?"** No, and the gaps are specific:
no KYC, no rate limiting, no live payment rails, no load testing. None of them
require rebuilding what is here.

## If something goes wrong mid-demo

- **A screen shows "Алдаа гарлаа"** — the database connection dropped. The
  *Дахин оролдох* button re-renders the screen; the local Postgres from
  `npm run db:start` is probably gone, so check that terminal.
- **A sign-in bounces back to the demo page** — the session cookie points at a
  user id that a reseed replaced. Pick the persona again.
- **The data looks wrong after you've been clicking around** — `npm run db:reset`
  restores it, but budget the 25 minutes.
