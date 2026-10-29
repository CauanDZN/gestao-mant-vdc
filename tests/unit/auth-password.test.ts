import { describe, expect, it } from "vitest";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("round-trips: the correct password verifies against its own hash", () => {
    const hash = hashPassword("senhaSecreta123");
    expect(verifyPassword("senhaSecreta123", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("senhaSecreta123");
    expect(verifyPassword("outraSenha", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", () => {
    const a = hashPassword("mesmaSenha");
    const b = hashPassword("mesmaSenha");
    expect(a).not.toBe(b);
    expect(verifyPassword("mesmaSenha", a)).toBe(true);
    expect(verifyPassword("mesmaSenha", b)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("qualquer", "nao-tem-dois-pontos")).toBe(false);
    expect(verifyPassword("qualquer", "")).toBe(false);
  });
});

describe("generateTempPassword", () => {
  it("generates a password of the requested length using a safe alphabet", () => {
    const password = generateTempPassword(10);
    expect(password).toHaveLength(10);
    expect(password).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("does not repeat the exact same password across calls (overwhelmingly likely)", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).not.toBe(b);
  });
});
