# TechRent — requirements gap plan (2026-10-27)

## Context

TechRent is live. Seven build phases from [docs/plan.md](plan.md) are done and
deployed on Vercel + Neon: owner, operator, company and admin modules, a tested
matching engine, a double-entry escrow ledger, Operator Academy, a parts store,
and QPay sandbox wallet top-ups.

A client requirements spreadsheet has now arrived —
`mongolia_matching_app_requirements_JP_EN.xlsx`, 51 features across 7 categories
(A01–G08), Japanese-origin and translated into Mongolian and English. Every row
is marked "Not started", which reflects the spreadsheet's authoring rather than
the codebase: roughly a fifth of the list is already built, a third is partly
built, and the rest is genuinely missing.

This plan maps all 51 requirements onto the existing code and sequences only the
real gaps. Decisions taken with the user before writing it:

- **Layer on the existing app.** Keep the deployed build and its data; no rebuild.
- **Operator Academy and the parts store stay as they are.** Neither appears in
  the spreadsheet. They are not extended, not removed, and not re-planned here.
- **Still an investor demo.** Real schema and real state machines, simulated
  externals — no production KYC, no live insurance carrier, no real telematics.
  `E09 accounting-software integration` is marked "future phase" in the
  spreadsheet itself and is out of scope.

Spreadsheet priorities are carried through verbatim: **Required**
(Зайлшгүй, 40 rows), **Recommended** (Зөвлөмжтэй, 10 rows), **Future phase**
(Ирээдүйн үе шат, 1 row).

## Where the code already stands

| ID | Requirement | Priority | State | Evidence |
|---|---|---|---|---|
| **A01** | Registration and login | Required | **done** (2026-10-28) | Google/Facebook sign-up opens an account with no further questions ([lib/auth/oauth.ts](../lib/auth/oauth.ts)); dormant until the provider secrets are set. Phone + OTP still works where the demo password gate is off |
| **A02** | Multi-role users | Required | **done** (2026-10-28) | `User.roles` + `activeRole`; `requireRole` asks what is *held*, and booking permissions come from what the actor is on that booking |
| **A03** | Identity / company verification | Required | partial | `User.verification` + admin verify/reject ([admin/users](<../app/[locale]/(dashboard)/admin/users/page.tsx>)); no documents, no per-document review trail |
| **A04** | Licence / qualification verification | Required | missing | Only proxies: `OperatorProfile.skills[]`, `level`, Academy `Certificate` |
| **A05** | Ratings and reviews | Recommended | **done** | `Review` with punctuality/quality/care subscores, two-way, feeds `ratingAvg` |
| **B01** | Equipment registration | Required | **done** | [owner/equipment/new](<../app/[locale]/(dashboard)/owner/equipment/new/page.tsx>), `saveEquipmentAction` |
| **B02** | Equipment categories | Required | partial | `EquipmentCategory` is 10 fixed construction types — **no agricultural machinery, no special vehicles**, not admin-editable |
| **B03** | Rental rate settings | Required | partial | `hourlyRate`/`dailyRate`/`monthlyRate` columns; `hourlyRate` is never used in a quote; **no area-based, no job-based** |
| **B04** | Location and service area | Required | partial | `aimag`/`district`/`lat`/`lng` on equipment; **no service radius or zone** — distance is only a scoring term |
| **B05** | Availability calendar | Required | **done** | `AvailabilityBlock` + blocking bookings, [owner/calendar](<../app/[locale]/(dashboard)/owner/calendar/page.tsx>) |
| **B06** | Inspection / maintenance history | Recommended | missing | `MAINTENANCE` is a status flag; `ServiceRequest` is a request, not a log, and has no FK to `Equipment` |
| **B07** | GPS location tracking | Required | missing | Static `lat`/`lng` only; no position history |
| **C01** | Equipment search | Required | partial | Filters + Leaflet map on [company](<../app/[locale]/(dashboard)/company/page.tsx>); **capacity is not filterable** (`specs` is opaque Json) |
| **C02** | Equipment matching | Required | **done** | [lib/matching/engine.ts](../lib/matching/engine.ts), explainable factor breakdown |
| **C03** | Operator matching | Required | **done** | Operator factor + distinct operator assignment down the ranking |
| **C04** | Quotation and pricing | Required | partial | One opaque `quotedAmount`; **no transport line, no insurance line** |
| **C05** | Booking request and approval | Required | partial | Owner confirms; **the operator never approves** — they are assigned by the matcher |
| **C06** | Changes and cancellations | Required | partial | `CANCEL` refunds whatever escrow holds, in full; **no reschedule/extend, no cancellation fee** |
| **C07** | Chat and notifications | Recommended | partial | 16 notification types, translated at render; **no messaging at all** |
| **C08** | Manual matching support | Required | missing | Re-run matching is exposed to the company, not to admin |
| **D01** | Contract review | Required | missing | No contract concept anywhere |
| **D02** | Electronic consent and records | Required | missing | — |
| **D03** | Handover inspection | Required | missing | `START` is one button; no photos, condition, fuel or hour-meter |
| **D04** | Work start / completion reports | Required | missing | `START`/`COMPLETE` only stamp timestamps |
| **D05** | Return / collection inspection | Required | missing | `VERIFY` is one button |
| **D06** | Extra charges and damage settlement | Required | missing | Amounts frozen at booking creation; `VERIFY` posts one full `RELEASE` |
| **D07** | Transport and delivery management | Recommended | missing | Only parts-store shipping exists |
| **D08** | Incident reporting | Required | missing | — |
| **E01** | Payment methods | Required | partial | QPay sandbox top-ups only ([lib/payments](../lib/payments)); no method management, no bank-transfer-with-reference |
| **E02** | Payment status tracking | Required | partial | Status exists on wallet top-up invoices; **nothing per booking** |
| **E03** | Price breakdown | Required | partial | `EscrowPanel` shows total/deposit/payouts/commission; no transport or insurance lines |
| **E04** | Commission calculation | Required | **done** | `PlatformSettings.commissionRate` → `Booking.commissionAmount` → `PLATFORM_REVENUE` |
| **E05** | Revenue and payout allocation | Required | **done** | `splitBookingAmount`, `RELEASE` transaction; no withdrawal path (by design for a demo) |
| **E06** | Invoices and receipts | Required | missing | `PaymentInvoice` is a QPay payment request, not a rental invoice or receipt |
| **E07** | Refund and receivables management | Required | partial | Refund posts on cancel; no refund approval, no overdue or outstanding tracking |
| **E08** | Accounting data export | Required | missing | No CSV or XLSX anywhere, and no library for either |
| **E09** | Accounting software integration | *Future phase* | — | Out of scope per the spreadsheet |
| **F01** | Insurance coverage verification | Required | missing | Zero insurance code repo-wide |
| **F02** | Insurance terms display | Required | missing | — |
| **F03** | Insurance enrollment | Recommended | missing | — |
| **F04** | Accident and damage reports | Recommended | missing | — |
| **F05** | Insurance claim management | Recommended | missing | — |
| **F06** | Safety checks | Recommended | missing | Only Academy course content mentions safety |
| **G01** | Admin dashboard | Required | **done** | [admin](<../app/[locale]/(dashboard)/admin/page.tsx>) — GMV, commission, escrow, queues, audit trail |
| **G02** | Review and approval management | Required | partial | Users verify/suspend done; **`EquipmentStatus.PENDING_REVIEW` has no admin queue**; licences have nothing |
| **G03** | Transaction management | Required | **done** | [admin/transactions](<../app/[locale]/(dashboard)/admin/transactions/page.tsx>) |
| **G04** | Commission and pricing administration | Required | partial | Commission / deposit / operator share are editable; no per-category or tiered pricing rules |
| **G05** | Customer support | Required | missing | No dispute or case log |
| **G06** | Revenue and profit analysis | Recommended | partial | Monthly series exists; **no breakdown by region or machine type** |
| **G07** | Admin permissions and audit trail | Required | partial | `AuditLog` is written in-transaction by every admin action; **`ADMIN` is one flat role** |
| **G08** | Announcements | Recommended | missing | — |

**Totals (as first written):** 9 done, 18 partial, 23 missing, 1 out of scope. Of the 40 Required
rows, 8 are done and 16 are partial — so the required work is more extension
than greenfield, except for category D (contracts, inspections, reports,
settlement), where 7 of 7 required rows are missing outright.

## Design decisions

Six choices shape everything below. They are recorded here because the rest of
the plan reads as arbitrary without them.

### 1. Multi-role is a membership check, not a second session (A02)

`User.role` becomes two fields: `roles Role[]` (what the user may be) and
`activeRole Role` (what they are looking at). The migration is pure SQL and
needs **no reseed**:

```sql
ALTER TABLE "User" ADD COLUMN "roles" "Role"[] DEFAULT ARRAY[]::"Role"[];
UPDATE "User" SET "roles" = ARRAY["role"];
ALTER TABLE "User" RENAME COLUMN "role" TO "activeRole";
```

The three profile tables are already optional 1:1, so a user holding
OWNER + OPERATOR simply gets both rows — no schema work there.

`requireRole` in [lib/auth/guards.ts](../lib/auth/guards.ts) changes from "is this
your role" to "do you hold this role", which keeps all **45 existing call sites
across 39 files** working unchanged. The session payload gains `roles[]`; the
sidebar builds from `user.roles.flatMap((r) => NAV[r])` instead of `NAV[role]`
([components/shell/nav-config.ts](../components/shell/nav-config.ts) is typed
`Record<Role, NavSection[]>`, so this is a call-site change, not a retype), and
the user menu gets a role switcher that sets `activeRole`.

The one genuinely interesting change is booking authorization. Today
`EVENT_ACTOR` keys off the session role and `lib/escrow/service.ts`
*separately* re-checks that the actor is really a party to the booking. With
multiple roles the session role stops being meaningful, so **derive the actor's
capacity from the party relation** — company of the order, owner of the
equipment, assigned operator — and check `EVENT_ACTOR[event]` against that.
This removes a redundant check rather than adding one, and it is what makes an
owner who also operates able to fire `START` on their own machine.

ADMIN stays single-role by policy.

### 2. Lifecycle gates are records, not statuses (D01–D05)

The spec inserts six steps into a lifecycle that is 6 events and 7 statuses.
Adding a status per step would multiply the UI and rewrite every escrow test for
little gain. The rule used here: **a new status only where the baton passes to a
party who cannot act yet.** That is true exactly twice.

| New status | Why it must exist |
|---|---|
| `AWAITING_OPERATOR` | The owner has confirmed; the operator must now accept (C05). Only used when the booking has an operator. |
| `SETTLING` | Work is done and the owner has priced extras; the company must see the final figure before money releases (D06). |

Everything else becomes a **prerequisite record** that gates an existing
transition:

| Record | Gates | Requirement |
|---|---|---|
| `ContractSignature` (one per party) | `START` | D01, D02 |
| `Inspection` kind `HANDOVER` | `START` | D03 |
| `SafetyCheck` | `START` | F06 |
| `WorkReport` | `COMPLETE` | D04 |
| `Inspection` kind `RETURN` | `SETTLE` | D05 |

Signing is **not** a booking event — it is its own server action writing a
`ContractSignature` row, so `planTransition` stays about money and status only.
The gates live in a new pure function `requirementsFor(event, booking, records)`
in [lib/escrow/booking.ts](../lib/escrow/booking.ts) that returns the missing
prerequisites, and `availableEvents(status)` grows a readiness argument. Pure,
so it is exhaustively testable — the same reasoning that made `planTransition`
pure in the first place.

Resulting event set: `CREATE, CONFIRM, ACCEPT, START, COMPLETE, SETTLE, VERIFY,
AMEND, CANCEL`.

### 3. Extras pass through; commission applies to rent only (D06)

Today `ownerPayout`/`commissionAmount`/`operatorPayout` are frozen at creation
and `VERIFY` posts one `RELEASE` of `totalAmount`. Extra charges arrive *after*
those numbers are fixed, so the settlement needs a defensible rule. The one
used here:

> The platform takes commission on the rental amount. Extra charges —
> overtime, fuel shortfall, damage — pass through to whoever is owed them, in
> full.

That is both simpler to explain to an investor and fairer than skimming a
damage recovery. So a new `BookingCharge` carries a `payee` (OWNER | OPERATOR |
PLATFORM) alongside `kind`, `amount` and a `status` (PROPOSED | ACCEPTED |
WAIVED | DISPUTED), and `VERIFY` posts:

```
escrow            −finalAmount
owner             +ownerPayout    + ownerExtras
operator          +operatorPayout + operatorExtras
PLATFORM_REVENUE  +commissionAmount + platformExtras
```

which sums to zero by construction. `finalAmount = totalAmount + acceptedExtras`
is frozen onto the booking at `SETTLE`, exactly as the payout columns are frozen
today.

Funding the extras is the part worth noting: escrow already holds the **full**
total by `IN_PROGRESS`, so extras need a fresh hold at settlement. That reuses
`fundingFor` — the existing simulated top-up from the `EXTERNAL` account that
already covers a short wallet at `CREATE` and `START`. No new device, and the
"extras exceed the deposit" case simply does not arise.

Cancellation gains a real fee (C06): refund `held − fee`, with the fee split
owner/platform by `commissionRate` and a new
`PlatformSettings.cancellationFeePercent`. Still zero-sum.

This all lands in a new pure `lib/escrow/settlement.ts` with its own tests.

### 4. Quotes become line items (C04, E03)

A quote must carry equipment, operator, transport and insurance separately and
keep them intact through matching → offer → booking → invoice.

`quoteFor` in [lib/equipment.ts](../lib/equipment.ts) returns
`{ lines, total }` where a line is
`{ kind, label, unit, quantity, unitPrice, amount }`. Because `quotedAmount`
stays the sum, **the existing `Match.quotedAmount` assertions keep passing** and
new tests cover the lines. `Match.breakdown` is already `Json`, so the lines ride
there with no migration; on acceptance `createBookingFromMatch` writes them as
`BookingLine` rows, which the invoice (E06) then reads.

`quoteFor` has exactly **one caller** —
[lib/matching/engine.ts:213](../lib/matching/engine.ts) — which is why this is a
contained change rather than a sweep.

- Transport line: `transportRatePerKm × distanceKm × 2`, from a new owner field (B04, D07).
- Insurance line: `premiumPercent × rental`, from the equipment's policy (F03).

### 5. Rate kinds extend the quote switch, not the columns (B03)

The three existing rate columns stay, so nothing that reads them breaks. Added:
`RateKind` enum (HOURLY, DAILY, MONTHLY, AREA, JOB), `Equipment.areaRate` +
`areaUnit` (M2 | HECTARE) + `jobRate` + `rateKinds RateKind[]`, and on `Order` a
`rateKind` plus `quantity` — so "3 hectares ploughed" is
`{ rateKind: AREA, quantity: 3 }` and "5 days" stays `{ rateKind: DAILY }`.

`quoteFor` becomes a switch in which **DAILY and MONTHLY keep calling
`effectiveDailyRate` unchanged**, so its tests are untouched; HOURLY finally
uses the `hourlyRate` column that is currently stored and never read. The
matching price factor compares a total to `budgetMax` and is indifferent to how
the total was reached — the only matching change is a new hard gate: the machine
must offer the order's `rateKind`.

B02's agricultural and special-vehicle categories are additive enum values
(TRACTOR, HARVESTER, SEEDER, SPRAYER, SPECIAL_VEHICLE) plus a
`CategoryGroup` map (CONSTRUCTION | AGRICULTURAL | SPECIAL) in
[lib/equipment.ts](../lib/equipment.ts). Grouping in code rather than a CRUD table
is the right trade for a demo: the spec asks for classification, not for
taxonomy administration.

### 6. Documents stay data URLs; invoices print; exports are hand-rolled CSV

Three "we have no library for this" problems, three deliberately boring answers.

**Documents (A03, A04, D03, D05, F04).** Extend the existing approach rather
than introducing blob storage. [components/equipment/photo-uploader.tsx](../components/equipment/photo-uploader.tsx)
already downscales client-side to ≤1400px JPEG at 0.82 and Zod caps each image
at 1.5 MB; ID cards, licences and inspection photos are the same shape. A shared
`Document` model (`kind`, `data`, `mimeType`, `caption`) is referenced by the
verification, inspection and incident records, and the uploader is generalised to
`components/ui/file-uploader.tsx`. Honest caveat worth stating in the demo: these
are base64 columns in Postgres, which is fine at demo volume, and the swap to
blob storage is a one-field change (`data` → `url`).

**Invoices and receipts (E06).** No PDF dependency. A printable route
`app/[locale]/(dashboard)/invoices/[id]/page.tsx` with a print stylesheet, and
the browser's own "Save as PDF". Server-rendered, zero deps, looks real.

**Accounting export (E08).** A hand-rolled `lib/export/csv.ts` — pure, tested,
RFC 4180 quoting, and a **UTF-8 BOM so Excel opens Mongolian Cyrillic without
mangling it**, which is the detail that actually matters for this client — behind
route handlers returning `text/csv`. A CSV writer is some thirty lines; `xlsx`
is a heavy dependency for a demo.

**GPS (B07).** An `EquipmentPosition` table (lat, lng, heading, speed,
`engineOn`, `recordedAt`) fed by a deterministic simulator
`lib/tracking/simulate.ts`: idle at home with no booking, on-site with jitter
while `IN_PROGRESS`, interpolated along the route on transport days, seeded by
the timestamp so it is stable per minute and needs no cron job. The existing
Leaflet components render it with a trail from the last N rows. Shaped so a real
telematics webhook would only have to insert rows — and the plan says plainly
that it is simulated.

**Insurance (F01–F05).** `InsurancePolicy` (per equipment or operator: insurer,
number, coverage, deductible, `premiumPercent`, dates, document, verification
status) covers F01 and F02; `BookingCoverage` covers F03 and feeds the insurance
quote line; `InsuranceClaim` covers F05. F04 accident reports are the same
`Incident` model that D08 needs — one model, two requirements.

## Build phases

Ordered so the invasive changes land before what builds on them. Each phase ends
at something runnable and demo-able, as the original plan's phases did.

### Phase 8 — Identity, roles and approval *(large)*
**A01, A02, A03, A04, G02, G07**

> **Partly delivered, 2026-10-28.** A02 multi-role and A01 self-registration are
> built and deployed, along with the order-time profile gate that pays for them.
> What remains in this phase is A03 identity documents, A04 licence records,
> G02 the equipment and licence approval queues, and G07 staff permission levels.

Multi-role users per decision 1 (schema + migration + guards + nav + role
switcher + the escrow capacity derivation). Self-registration: a sign-up form
that creates the user and its profile rows, reusing the existing OTP path — the
only change to [lib/auth/otp.ts](../lib/auth/otp.ts) is allowing an unknown phone
through registration. `Document` model and the generalised uploader. ID and
company-certificate upload; operator licence records with class, number, issuer,
expiry and document. Admin review queues for users, **equipment in
`PENDING_REVIEW`** (which the seed already creates and nothing can currently
approve) and licences. `AdminPermission` levels replacing the flat `ADMIN`,
enforced in `requireRole` and written to the existing `AuditLog`.

*Demo outcome:* a visitor registers, uploads an ID, an admin approves them, and
one account switches between owner and operator views.

### Phase 9 — Catalogue, pricing and search *(medium)*
**B02, B03, B04, C01, C04, E03**

Agricultural and special-vehicle categories with the group map. `RateKind` and
the `quoteFor` switch per decision 5. Service area and `transportRatePerKm` on
the owner's equipment. A structured `capacity` field so C01 can filter on it —
today `specs` is free-form Mongolian key→string pairs (`Жин: "20.5 т"`,
`Хувин: "1.2 м3"`) and cannot be queried. Quote line items per decision 4, shown
on the offer card and the booking.

*Demo outcome:* an order for "3 hectares ploughed" matches a tractor and returns
an itemised quote with a transport line.

### Phase 10 — Contract and rental lifecycle *(large — the heart of the spec)*
**C05, C06, D01, D02, D03, D04, D05, F06**

The lifecycle work of decision 2: two new statuses, the `ACCEPT`, `SETTLE` and
`AMEND` events, `requirementsFor` gates, and the records behind them —
`ContractSignature`, `Inspection` (HANDOVER and RETURN, with photos, condition,
fuel level and hour-meter), `SafetyCheck`, `WorkReport`. Contract terms rendered
from the booking and its lines, e-consent by both parties, and a contract archive.
Booking amendments for reschedule and extend.

*Demo outcome:* the full walkthrough gains a signed contract, a handover
checklist with photos, a work report, and a return inspection.

### Phase 11 — Settlement, payment and accounting *(large)*
**D06, D07, E01, E02, E06, E07, E08, G04**

`BookingCharge` and `lib/escrow/settlement.ts` per decision 3, plus the
cancellation fee. Transport and delivery scheduling (D07) priced from the
transport line. Payment-method records and per-booking payment status (E01, E02).
`Invoice` with the printable route, and receipts on release (E06). Refund
approval and an overdue/receivables view (E07). CSV export routes (E08). Per-category
commission and pricing rules on the settings page (G04).

*Demo outcome:* a job finishes with a fuel shortfall and damage charge, the
company sees the revised total, money releases against it, and an invoice prints.

### Phase 12 — Insurance and incidents *(medium)*
**D08, F01, F02, F03, F04, F05**

`Incident` with photos and parties (serving D08 and F04). `InsurancePolicy` with
admin verification and a terms panel. `BookingCoverage` enrollment feeding the
insurance quote line. `InsuranceClaim` with its review and payout states, settled
through the ledger like any other money movement.

*Demo outcome:* an incident is filed against a booking, becomes a claim, and is
paid out.

### Phase 13 — Operations, analytics and comms *(medium–large)*
**B06, B07, C07, C08, G05, G06, G08**

Maintenance and inspection history per machine (B06), linked to the store's
existing `ServiceRequest` — which currently has no foreign key to `Equipment`
and should gain one. GPS tracking per decision 6. Messaging (C07) as
request–response through server actions and `revalidatePath`, **not** websockets
— there is no realtime infrastructure and a demo does not need any. Admin manual
matchmaking (C08). Support and dispute case log (G05). Revenue analysis by region
and machine type (G06). Announcements (G08).

### Phase 14 — Seed, i18n and redeploy *(medium)*

Extend `prisma/seed/` so every new model carries believable Mongolian data —
signed contracts, inspections with photos, a settled booking with extras, live
positions, policies and one claim. Both message catalogs (currently 743 leaf
strings in 26 groups) grow together; `npm run check:messages` gates it. Mobile
pass on the new screens, then migrate and reseed Neon.

## What is deliberately not built

- **E09 accounting-software integration** — the spreadsheet marks it future phase.
- **Real SMS and email** for A01. Phone + OTP was removed entirely in the auth
  rework (`docs/auth-rework-plan.md`) — it could never send a code without a
  gateway. Sign-in is a social provider for marketplace accounts and a username
  and password for staff.
- **Realtime chat.** C07 ships as request–response, per Phase 13.
- **Withdrawals.** `TransactionType.WITHDRAWAL` exists in the enum and no code
  posts it. The spreadsheet asks for payout *allocation* (E05, done), not for
  money leaving the platform, so this stays out.
- **Equipment category CRUD.** Enum plus group map, per decision 5.

## Tests

Existing suite is ~120 pure-logic cases in 9 files, vitest, node environment, no
DB. Two files will need real work:

- `lib/escrow/__tests__/booking.test.ts` — new statuses, events and gates;
  expect a substantial rewrite. Its zero-sum assertions across every transition
  are the most valuable tests in the repo and must be extended to cover
  settlement with extras and cancellation with a fee.
- `lib/matching/__tests__/engine.test.ts` — `quoteFor` now returns lines, and
  there is a new `rateKind` hard gate. The `quotedAmount` assertions survive
  because the sum is unchanged.

`money.test.ts`, `ledger.test.ts`, `topup.test.ts`, `purchase.test.ts`,
`grading.test.ts`, `dates.test.ts` and `db-retry.test.ts` should be unaffected.

New pure modules that deserve their own `__tests__` alongside, following the
existing pattern: `lib/escrow/settlement.ts`, the `requirementsFor` gates,
`lib/export/csv.ts` (quoting and the BOM), `lib/tracking/simulate.ts`
(determinism), `lib/insurance/premium.ts`, and the `quoteFor` rate-kind switch.

## Verification

**Before anything else — check what `DATABASE_URL` points at.** `.env` currently
holds the Neon string, so `db:reset` and `db:seed` drop every table in the *live*
demo, and a reseed takes about 25 minutes while printing nothing. Point `.env` at
a local `npm run db:start` server for the whole of this build; apply to Neon only
at Phase 14, with `npx prisma migrate deploy` and a single deliberate reseed.

Per phase: `npm run typecheck`, `npm run lint`, `npm run test`,
`npm run check:messages`, and `next build` — which must still succeed against an
unreachable database, so every new page reading live rows needs
`export const dynamic = "force-dynamic"`.

**Extended end-to-end demo path**, replacing the one in
[docs/walkthrough.md](walkthrough.md): register and get approved → upload a
licence → create an order priced by area → review itemised offers → accept →
owner confirms → **operator accepts** → **both sign the contract** → **handover
inspection with photos and a safety check** → work report → **return inspection
finds a fuel shortfall** → **company reviews the revised total** → verify →
confirm the ledger still sums to zero with extras paid through to the owner →
**invoice prints** → file an incident → raise and pay a claim → **export the
month to CSV and open it in Excel with Cyrillic intact**.

Manual pass on every new screen in both `mn` and `en` and at 375px, then the
same walkthrough on a phone against Neon after the Phase 14 deploy.
