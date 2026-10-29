import { describe, expect, it } from "vitest";
import {
  canAccessFinance,
  canAccessSettings,
  canEditFinance,
  canManageUsers,
  isRole,
  ROLES,
} from "@/lib/auth/roles";

describe("isRole", () => {
  it("accepts every known role", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
  });

  it("rejects an unknown string", () => {
    expect(isRole("admin")).toBe(false);
  });
});

describe("permission helpers", () => {
  it("only bispa can manage users and settings", () => {
    expect(canManageUsers("bispa")).toBe(true);
    expect(canManageUsers("pastor")).toBe(false);
    expect(canAccessSettings("bispa")).toBe(true);
    expect(canAccessSettings("tesouraria")).toBe(false);
  });

  it("bispa, pastor and tesouraria can view finance, but a pastor cannot edit it", () => {
    for (const role of ["bispa", "pastor", "tesouraria"] as const) {
      expect(canAccessFinance(role)).toBe(true);
    }
    expect(canAccessFinance("membro")).toBe(false);
    expect(canAccessFinance("secretaria")).toBe(false);

    expect(canEditFinance("bispa")).toBe(true);
    expect(canEditFinance("tesouraria")).toBe(true);
    expect(canEditFinance("pastor")).toBe(false);
  });
});
