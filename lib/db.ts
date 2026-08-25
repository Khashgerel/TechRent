import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { withConnectionRetry } from "@/lib/db-retry";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

/**
 * Retries at the driver level rather than through a Prisma client extension.
 *
 * Two reasons. The client's type stays exactly `PrismaClient`, so every helper
 * that accepts either a client or a transaction client still typechecks. And
 * only `pool.query` is wrapped — the non-transactional path. Work inside an
 * interactive transaction runs on a checked-out client and is deliberately left
 * alone, because replaying half a transaction is far worse than failing.
 *
 * The failure this exists for: a pooled connection closed between checkout and
 * use. Hosts that sleep or recycle idle connections (Neon) do it routinely, and
 * a restarted local Postgres does it every time. The query is valid, so the
 * right answer is a fresh connection — not a 500.
 */
function createRetryingPool() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    // Retire connections before the server does, so fewer dead ones are handed
    // out at all. The retry covers whatever still slips through.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });

  // An idle client erroring emits on the pool; with no listener Node treats it
  // as an unhandled 'error' event and takes the process down.
  pool.on("error", () => {});

  const query = pool.query.bind(pool);

  pool.query = ((...args: unknown[]) =>
    withConnectionRetry(() =>
      (query as (...a: unknown[]) => Promise<unknown>)(...args),
    )) as typeof pool.query;

  return pool;
}

function createClient() {
  return new PrismaClient({ adapter: new PrismaPg(createRetryingPool()) });
}

export const db = globalForPrisma.prisma ?? createClient();

// Reuse the client across hot reloads in development so we don't exhaust the
// connection pool.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
