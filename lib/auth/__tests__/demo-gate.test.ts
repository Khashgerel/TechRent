import { afterEach, describe, expect, it } from "vitest";
import {
  checkDemoPassword,
  demoGateEnabled,
  passwordMatches,
  phoneLoginBlocked,
} from "../demo-gate";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("passwordMatches", () => {
  it("accepts the exact password", () => {
    expect(passwordMatches("barilga-2026", "barilga-2026")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(passwordMatches("barilga-2026", "barilga-2025")).toBe(false);
  });

  it("is case and whitespace sensitive", () => {
    expect(passwordMatches("Barilga", "barilga")).toBe(false);
    expect(passwordMatches("barilga", " barilga")).toBe(false);
  });

  it("handles lengths that differ without throwing", () => {
    // Both sides are hashed to 32 bytes first, so timingSafeEqual never sees
    // mismatched lengths — the case that would otherwise throw.
    expect(() => passwordMatches("short", "a-much-longer-guess")).not.toThrow();
    expect(passwordMatches("short", "a-much-longer-guess")).toBe(false);
  });

  it("never matches when no password is set", () => {
    expect(passwordMatches("", "")).toBe(false);
    expect(passwordMatches("", "anything")).toBe(false);
  });

  it("compares non-ASCII passwords by bytes", () => {
    expect(passwordMatches("нууцүг", "нууцүг")).toBe(true);
    expect(passwordMatches("нууцүг", "нууцyг")).toBe(false);
  });
});

describe("demoGateEnabled", () => {
  it("is off until DEMO_PASSWORD is set", () => {
    delete process.env.DEMO_PASSWORD;
    expect(demoGateEnabled()).toBe(false);
  });

  it("treats an empty password as no gate", () => {
    process.env.DEMO_PASSWORD = "";
    expect(demoGateEnabled()).toBe(false);
    expect(checkDemoPassword("")).toBe(false);
  });

  it("is on once a password is set", () => {
    process.env.DEMO_PASSWORD = "barilga-2026";
    expect(demoGateEnabled()).toBe(true);
    expect(checkDemoPassword("barilga-2026")).toBe(true);
    expect(checkDemoPassword("nope")).toBe(false);
  });
});

describe("phoneLoginBlocked", () => {
  it("leaves phone login alone when no password is set", () => {
    delete process.env.DEMO_PASSWORD;
    delete process.env.DEMO_MODE;
    expect(phoneLoginBlocked()).toBe(false);
  });

  it("blocks phone login while the gate guards a demo", () => {
    process.env.DEMO_PASSWORD = "barilga-2026";
    delete process.env.DEMO_MODE;
    expect(phoneLoginBlocked()).toBe(true);
  });

  it("leaves phone login open on a real deployment", () => {
    // Demo mode off means codes go out by SMS rather than to the screen, so
    // blocking the phone door would lock everyone out.
    process.env.DEMO_PASSWORD = "barilga-2026";
    process.env.DEMO_MODE = "false";
    expect(phoneLoginBlocked()).toBe(false);
  });
});
