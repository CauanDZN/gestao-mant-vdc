import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-only-used-in-vitest";
});

describe("signSession / verifySessionToken", () => {
  it("round-trips a valid session payload", async () => {
    const { signSession, verifySessionToken } = await import("@/lib/auth/session");
    const token = signSession({ userId: "u1", churchId: "vdc-main", role: "bispa" });
    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("u1");
    expect(payload?.role).toBe("bispa");
  });

  it("rejects a tampered payload", async () => {
    const { signSession, verifySessionToken } = await import("@/lib/auth/session");
    const token = signSession({ userId: "u1", churchId: "vdc-main", role: "membro" });
    const [body, signature] = token.split(".");
    const tamperedBody = Buffer.from(
      JSON.stringify({ userId: "u2", churchId: "vdc-main", role: "bispa", exp: Math.floor(Date.now() / 1000) + 1000 }),
    ).toString("base64url");
    expect(verifySessionToken(`${tamperedBody}.${signature}`)).toBeNull();
    expect(body).toBeDefined();
  });

  it("rejects an expired token", async () => {
    const { signSession, verifySessionToken } = await import("@/lib/auth/session");
    const token = signSession({ userId: "u1", churchId: "vdc-main", role: "bispa" }, -10);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects a missing or malformed token", async () => {
    const { verifySessionToken } = await import("@/lib/auth/session");
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("not-a-token")).toBeNull();
  });
});
