import { describe, expect, it } from "vitest";
import { clamp, sum, toCsv, uid } from "@/lib/utils";

describe("uid", () => {
  it("prefixes the generated id and produces unique values", () => {
    const a = uid("person");
    const b = uid("person");
    expect(a.startsWith("person_")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("clamp", () => {
  it("clamps within the default 0-100 range", () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(42)).toBe(42);
  });
});

describe("sum", () => {
  it("adds up a list of numbers", () => {
    expect(sum([1, 2, 3.5])).toBe(6.5);
    expect(sum([])).toBe(0);
  });
});

describe("toCsv", () => {
  it("joins rows with semicolons and CRLF, quoting values that need it", () => {
    const csv = toCsv([
      ["Nome", "Valor"],
      ["Ana; Paula", 10],
      ['Com "aspas"', 5],
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Nome;Valor");
    expect(lines[1]).toBe('"Ana; Paula";10');
    expect(lines[2]).toBe('"Com ""aspas""";5');
  });
});
