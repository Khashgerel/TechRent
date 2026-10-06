# QPay payments

Wallet top-ups run through [QPay](https://qpay.mn)'s V2 merchant API. **Only the
sandbox is wired up** — `merchant-sandbox.qpay.mn` — and switching to production
takes two deliberate environment variables, not one.

Reference: the V2 API workbook (`2026.3.17 V2 API with Ebarimt 3.0`), sheets
`API`, `token`, `invoice_create_simple`, `payment_check`, `callback URL`.

## Where it fits

TechRent's ledger already had a `TOPUP` transaction type: money entering the
platform debits the `EXTERNAL` account and credits a user's wallet. Until now
that happened implicitly — a booking or a parts order that exceeded a wallet's
balance topped it up out of thin air.

QPay makes the same transaction real. Nothing downstream changed: escrow,
commission splits and store checkout still read a balance summed from
`LedgerEntry` rows, and cannot tell a QPay top-up from an implicit one.

> The implicit funding is still in place. A booking whose wallet is short is
> still auto-funded, so the wallet page is additive rather than a gate. Gating
> checkout on a real balance is a separate decision — see "Open questions".

## The flow

1. **Visitor picks an amount** on `/[locale]/wallet`.
2. **`createTopupAction`** calls `POST /v2/invoice` and stores a
   `PaymentInvoice` row with QPay's `invoice_id`, the QR (a base64 PNG rendered
   inline), the short URL and the per-bank deeplinks.
3. **The visitor pays** by scanning the QR in a bank app, or by opening one of
   the bank deeplinks.
4. **QPay calls back** — `GET /api/qpay/callback?invoice=<senderInvoiceNo>` —
   and the route answers HTTP 200 with the body `SUCCESS`, exactly as QPay's
   documentation requires.
5. **The app asks QPay what happened** via `POST /v2/payment/check`. The
   callback is only a hint: the amount and status always come from the check, so
   a forged callback can at worst cause an extra check.
6. **On `PAID`**, the wallet is credited: one balanced `TOPUP` transaction,
   `EXTERNAL → wallet`, plus a notification.

The **check button** on the wallet page does step 5 on demand. That is the path
that works while developing, because QPay cannot reach `localhost` — and it is
the only polling QPay permits. Their documentation is explicit: *"Do not check
transactions constantly using a cron job. Use only the callback URL."* Nothing
in this integration polls on a timer.

## Settling exactly once

QPay may call the callback more than once, and the visitor may press check at
the same moment. `creditTopup` claims the invoice with a conditional update:

```ts
const claim = await tx.paymentInvoice.updateMany({
  where: { id, status: "PENDING", ledgerTransactionId: null },
  data: { status: "PAID", ... },
});
if (claim.count !== 1) return 0;
```

Only the caller that flips `PENDING → PAID` posts to the ledger, and
`ledgerTransactionId` is unique, so a second credit cannot be recorded even if
the guard were bypassed. Verified against the real database: a second credit
returns 0 and the balance does not move.

## Configuration

```bash
QPAY_ENV="sandbox"
QPAY_USERNAME="TEST_MERCHANT"      # from QPay
QPAY_PASSWORD="123456"
QPAY_INVOICE_CODE="TEST_INVOICE"   # the invoice code QPay issues per merchant
```

Those three values are QPay's own published sandbox merchant and work as-is.
Replace them with yours when you have them.

**Tokens instead of credentials.** If you only have a token pair, set
`QPAY_ACCESS_TOKEN` and `QPAY_REFRESH_TOKEN` and leave username/password unset.
Access tokens are short-lived — roughly 16 hours in the sandbox — so the client
refreshes with the refresh token when the access token expires. Username and
password are the sustainable choice because they renew indefinitely.

Tokens are cached in module scope and reused until a minute before expiry, which
is the other rule QPay states outright: *"Do not repeatedly fetch tokens before
the timestamp expires."*

**Callbacks while developing.** QPay cannot reach `localhost`. Either press the
check button, or expose the app and set the base URL:

```bash
npx cloudflared tunnel --url http://localhost:3000   # or ngrok http 3000
QPAY_CALLBACK_BASE_URL="https://<your-tunnel>.trycloudflare.com"
```

On Vercel, leave `QPAY_CALLBACK_BASE_URL` unset — the deployment URL is used.

## Going to production

Not done, and deliberately awkward to do by accident:

1. Set `QPAY_ENV="production"` **and** `QPAY_ALLOW_PRODUCTION="true"`. Without
   the second one the client throws rather than talking to the live API.
2. Swap in the production merchant credentials and invoice code.
3. Point `QPAY_CALLBACK_BASE_URL` at the production domain, and confirm QPay has
   whitelisted it if they require that.
4. Decide about **ebarimt**. Real Mongolian receipts are a legal requirement for
   consumer payments, and the V2 API covers them
   (`POST /v2/ebarimt_v3/create` with a `payment_id`, plus the VAT and GS1 data
   the workbook's `ebarim_create` sheet specifies). None of that is implemented:
   `lib/payments/` creates invoices and reads payments, nothing more.
5. Review refunds. `POST /v2/payment/refund` exists and is not wired up; a
   refund today would have to be made in QPay's merchant console, and the
   ledger corrected separately.

## Open questions

- **Should checkout require a funded wallet?** Today escrow still auto-funds a
  short wallet, which makes the wallet page a convenience rather than a
  requirement. Turning that off would make QPay load-bearing for the demo — and
  would mean a booking cannot be made until a real sandbox payment clears.
- **Partial payments.** Invoices are created without `allow_partial`, so a
  partial payment should not happen. If one does, the invoice stays `PENDING`,
  nothing is credited, and the page says to contact support rather than guessing.
- **Who can top up.** Any signed-in persona, including on the public demo, can
  create sandbox invoices. Harmless while sandbox-only; worth a thought before
  production.
