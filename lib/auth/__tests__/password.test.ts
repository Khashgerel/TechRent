import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("hashPassword", () => {
  it("accepts the password it hashed", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery stapl", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    // Both still verify: the salt travels with the hash.
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("never stores the password itself", async () => {
    const stored = await hashPassword("hunter2");
    expect(stored).not.toContain("hunter2");
  });

  it("records the parameters it used, so they can change later", async () => {
    const stored = await hashPassword("x");
    expect(stored.split("$").slice(0, 4)).toEqual(["scrypt", "16384", "8", "1"]);
  });

  it("handles non-ASCII passwords", async () => {
    const stored = await hashPassword("нууцүг-монгол");
    expect(await verifyPassword("нууцүг-монгол", stored)).toBe(true);
    expect(await verifyPassword("нууцүг-монго", stored)).toBe(false);
  });

  it("treats equivalent Unicode spellings as the same password", async () => {
    // é as one code point, then as e + combining accent. A password manager
    // may normalise differently from the keyboard that first typed it.
    const stored = await hashPassword("caf\u00e9");
    expect(await verifyPassword("cafe\u0301", stored)).toBe(true);
  });
});

describe("verifyPassword", () => {
  it("refuses an account that has no password yet", async () => {
    // This is what makes it safe to create a staff account before
    // `admin:create` has given it a password.
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("", null)).toBe(false);
  });

  it("refuses a malformed hash instead of throwing", async () => {
    for (const bad of [
      "",
      "not-a-hash",
      "scrypt$16384$8",
      "bcrypt$16384$8$1$c2FsdA$aGFzaA",
      "scrypt$notanumber$8$1$c2FsdA$aGFzaA",
      "scrypt$16384$8$1$$",
    ]) {
      await expect(verifyPassword("x", bad)).resolves.toBe(false);
    }
  });
});
