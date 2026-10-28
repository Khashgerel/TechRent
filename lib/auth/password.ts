import {
  randomBytes,
  scrypt as scryptCb,
  type ScryptOptions,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for staff sign-in.
 *
 * scrypt from `node:crypto` rather than bcrypt or argon2: both of those are
 * native modules, and this is the only password in the system — not worth a
 * compiled dependency on a platform that has a memory-hard KDF built in.
 *
 * The stored format is `scrypt$N$r$p$salt$hash`, all base64url. Keeping the
 * parameters in the string means a future change to them can re-hash on next
 * sign-in without a migration, because every existing hash still says how it
 * was made.
 */

// `promisify` loses the overload that takes options, so the signature is
// restated here rather than casting the result at every call site.
const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// ~100ms on a modern server. High enough to make guessing expensive, low
// enough that a sign-in doesn't feel slow.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const b64 = (buf: Buffer) => buf.toString("base64url");

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
  });

  return `scrypt$${N}$${R}$${P}$${b64(salt)}$${b64(key)}`;
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed or absent hash, so a staff
 * account that has no password yet simply cannot sign in — which is what makes
 * it safe to create one before `admin:create` has given it a password.
 */
export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const n = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(rawSalt, "base64url");
    expected = Buffer.from(rawKey, "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      // scrypt's default memory cap is sized for the default parameters; make
      // it follow whatever the stored hash actually used.
      maxmem: 256 * n * r,
    });
  } catch {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
