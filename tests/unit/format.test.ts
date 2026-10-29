import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, initials, toDateInput } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats a positive number as BRL", () => {
    expect(formatCurrency(1840)).toBe("R$ 1.840,00");
  });

  it("falls back to zero for non-finite values", () => {
    expect(formatCurrency(Number.NaN)).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as dd/MM/yyyy", () => {
    expect(formatDate("2026-10-28")).toBe("28/10/2026");
  });

  it("returns an em dash for empty/invalid input", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("initials", () => {
  it("builds initials from the first two words", () => {
    expect(initials("Ana Paula Costa")).toBe("AP");
  });

  it("handles a single-word name", () => {
    expect(initials("Cauan")).toBe("C");
  });
});

describe("toDateInput", () => {
  it("normalizes a date string to yyyy-MM-dd for <input type=date>", () => {
    expect(toDateInput("2026-10-28")).toBe("2026-10-28");
  });
});
