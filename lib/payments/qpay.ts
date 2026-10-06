import "server-only";

/**
 * QPay V2 client — sandbox only.
 *
 * The base URL is chosen from `QPAY_ENV`, which defaults to `sandbox` and
 * refuses to resolve to production unless `QPAY_ALLOW_PRODUCTION` is also set.
 * That second switch exists so going live is a deliberate act rather than a
 * typo in an environment variable.
 *
 * Two rules from QPay's own documentation are enforced here rather than left to
 * callers:
 *   - "Do not fetch a token repeatedly before it expires" — tokens are cached
 *     in module scope and reused until shortly before `expires_in`.
 *   - "Do not poll with a cron job; use the callback" — nothing in this file
 *     polls. `checkPayment` is called once per callback or per explicit press
 *     of the check button.
 */

const ENVIRONMENTS = {
  sandbox: "https://merchant-sandbox.qpay.mn/v2",
  production: "https://merchant.qpay.mn/v2",
} as const;

export type QpayEnvironment = keyof typeof ENVIRONMENTS;

export class QpayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QpayConfigError";
  }
}

export class QpayApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: unknown,
  ) {
    super(`QPay ${path} failed with ${status}`);
    this.name = "QpayApiError";
  }
}

export function qpayEnvironment(): QpayEnvironment {
  const requested = (process.env.QPAY_ENV ?? "sandbox").toLowerCase();

  if (requested === "sandbox") return "sandbox";

  if (requested === "production") {
    if (process.env.QPAY_ALLOW_PRODUCTION !== "true") {
      throw new QpayConfigError(
        'QPAY_ENV=production also needs QPAY_ALLOW_PRODUCTION="true". ' +
          "Review merchant credentials, the callback URL and the ebarimt " +
          "requirements before flipping it.",
      );
    }
    return "production";
  }

  throw new QpayConfigError(
    `QPAY_ENV must be "sandbox" or "production", not ${JSON.stringify(requested)}`,
  );
}

export function qpayBaseUrl() {
  return ENVIRONMENTS[qpayEnvironment()];
}

/** True when the credentials needed to talk to QPay are present. */
export function qpayConfigured() {
  const hasBasic = Boolean(process.env.QPAY_USERNAME && process.env.QPAY_PASSWORD);
  const hasToken = Boolean(process.env.QPAY_ACCESS_TOKEN);
  return Boolean(process.env.QPAY_INVOICE_CODE) && (hasBasic || hasToken);
}

function invoiceCode() {
  const code = process.env.QPAY_INVOICE_CODE;
  if (!code) {
    throw new QpayConfigError(
      "QPAY_INVOICE_CODE is not set — QPay issues this code with the merchant account.",
    );
  }
  return code;
}

type TokenResponse = {
  token_type?: string;
  access_token: string;
  refresh_token?: string;
  /** Unix seconds, despite the name. */
  expires_in?: number;
  refresh_expires_in?: number;
};

type CachedToken = {
  environment: QpayEnvironment;
  accessToken: string;
  refreshToken?: string;
  /** Milliseconds since the epoch, already reduced by the safety margin. */
  usableUntil: number;
};

/** Renew a minute early so a request never travels with a just-expired token. */
const EXPIRY_MARGIN_MS = 60_000;

let cached: CachedToken | null = null;
/** Collapses concurrent requests onto one token fetch. */
let inflight: Promise<CachedToken> | null = null;

function expiryToMs(expiresIn: number | undefined) {
  // QPay sends an absolute unix timestamp in `expires_in`. Older merchant
  // accounts have been seen sending a relative lifetime instead, so treat
  // small numbers as a duration.
  if (!expiresIn) return Date.now() + 10 * 60_000;
  return expiresIn > 1_000_000_000 ? expiresIn * 1000 : Date.now() + expiresIn * 1000;
}

function store(environment: QpayEnvironment, token: TokenResponse): CachedToken {
  cached = {
    environment,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    usableUntil: expiryToMs(token.expires_in) - EXPIRY_MARGIN_MS,
  };
  return cached;
}

async function postToken(
  path: "/auth/token" | "/auth/refresh",
  authorization: string,
): Promise<TokenResponse> {
  const response = await fetch(`${qpayBaseUrl()}${path}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: "",
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new QpayApiError(response.status, path, body);

  const token = body as TokenResponse;
  if (!token?.access_token) throw new QpayApiError(response.status, path, body);
  return token;
}

async function mintToken(): Promise<CachedToken> {
  const environment = qpayEnvironment();

  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;

  if (username && password) {
    const basic = Buffer.from(`${username}:${password}`).toString("base64");
    return store(environment, await postToken("/auth/token", `Basic ${basic}`));
  }

  // No merchant credentials: fall back to the tokens handed over by hand. The
  // refresh token outlives the access token, so it can carry the integration
  // until username/password are configured.
  const refreshToken = cached?.refreshToken ?? process.env.QPAY_REFRESH_TOKEN;
  if (refreshToken) {
    try {
      return store(
        environment,
        await postToken("/auth/refresh", `Bearer ${refreshToken}`),
      );
    } catch (error) {
      if (!process.env.QPAY_ACCESS_TOKEN) throw error;
    }
  }

  const accessToken = process.env.QPAY_ACCESS_TOKEN;
  if (accessToken) {
    return store(environment, {
      access_token: accessToken,
      refresh_token: process.env.QPAY_REFRESH_TOKEN,
      expires_in: Number(process.env.QPAY_ACCESS_TOKEN_EXPIRES_IN) || undefined,
    });
  }

  throw new QpayConfigError(
    "No QPay credentials: set QPAY_USERNAME and QPAY_PASSWORD, or QPAY_ACCESS_TOKEN.",
  );
}

async function accessToken(): Promise<string> {
  const environment = qpayEnvironment();

  if (cached && cached.environment === environment && Date.now() < cached.usableUntil) {
    return cached.accessToken;
  }

  inflight ??= mintToken().finally(() => {
    inflight = null;
  });

  return (await inflight).accessToken;
}

/** Drops the cached token so the next call mints a fresh one. */
export function forgetQpayToken() {
  cached = null;
}

async function request<T>(
  path: string,
  init: { method: "POST" | "GET" | "DELETE"; body?: unknown },
): Promise<T> {
  const send = async (token: string) =>
    fetch(`${qpayBaseUrl()}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });

  let response = await send(await accessToken());

  // A token can be invalidated on QPay's side before it expires on ours
  // ("not-before-policy"), so one retry with a fresh token is worth it.
  if (response.status === 401) {
    forgetQpayToken();
    response = await send(await accessToken());
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new QpayApiError(response.status, path, body);
  return body as T;
}

export type QpayDeeplink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

export type QpayInvoiceResponse = {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  qPay_shortUrl: string;
  urls: QpayDeeplink[];
};

export type CreateInvoiceInput = {
  /** Our own unique reference. Alphanumeric only — QPay rejects the rest. */
  senderInvoiceNo: string;
  /** Who the invoice is addressed to, in our own terms. */
  receiverCode: string;
  description: string;
  amount: number;
  callbackUrl: string;
};

export async function createInvoice(input: CreateInvoiceInput) {
  return request<QpayInvoiceResponse>("/invoice", {
    method: "POST",
    body: {
      invoice_code: invoiceCode(),
      sender_invoice_no: input.senderInvoiceNo,
      invoice_receiver_code: input.receiverCode,
      invoice_description: input.description,
      amount: input.amount,
      callback_url: input.callbackUrl,
    },
  });
}

export async function cancelInvoice(invoiceId: string) {
  return request<unknown>(`/invoice/${invoiceId}`, { method: "DELETE" });
}

export type QpayPaymentRow = {
  payment_id: string;
  payment_status: "NEW" | "FAILED" | "PAID" | "PARTIAL" | "REFUNDED";
  payment_amount: string | number;
  payment_currency?: string;
  payment_wallet?: string;
  payment_type?: string;
};

export type QpayCheckResponse = {
  count: number;
  /** Absent when `count` is 0. */
  paid_amount?: string | number;
  rows: QpayPaymentRow[];
};

/**
 * Asks QPay what has actually been paid against an invoice. This is the only
 * statement of payment the app trusts — a callback is treated as a hint that it
 * is worth asking, never as proof on its own.
 */
export async function checkPayment(invoiceId: string) {
  return request<QpayCheckResponse>("/payment/check", {
    method: "POST",
    body: {
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    },
  });
}
