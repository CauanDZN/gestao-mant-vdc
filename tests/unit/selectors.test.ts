import { describe, expect, it } from "vitest";
import {
  averageAttendance,
  currentMonth,
  formatMonthLabel,
  monthKey,
  monthTotals,
  monthTransactions,
  peopleNeedingCare,
  shiftMonth,
} from "@/lib/selectors";
import type { ChurchDatabase, ChurchPerson } from "@/lib/types";

function basePerson(overrides: Partial<ChurchPerson>): ChurchPerson {
  return {
    id: "p-1",
    name: "Pessoa Teste",
    phone: "",
    email: "",
    birthday: "",
    stage: "membro",
    group: "",
    firstVisit: "2024-01-01",
    notes: "",
    contactDates: [],
    ...overrides,
  };
}

function baseDb(overrides: Partial<ChurchDatabase>): ChurchDatabase {
  return {
    version: 1,
    settings: { churchName: "Igreja Teste", location: "Teste", monthlyGoal: 1000, openingBalance: 0 },
    transactions: [],
    assets: [],
    events: [],
    people: [],
    commitments: [],
    counters: { transaction: 1, asset: 1, event: 1, person: 1 },
    ...overrides,
  };
}

describe("monthKey / shiftMonth / formatMonthLabel / currentMonth", () => {
  it("extracts the YYYY-MM prefix from an ISO date", () => {
    expect(monthKey("2026-10-28")).toBe("2026-10");
  });

  it("shifts a month forward and backward, rolling over the year", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("formats a month label in Portuguese", () => {
    expect(formatMonthLabel("2026-10")).toMatch(/outubro/i);
  });

  it("currentMonth matches today's YYYY-MM", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(currentMonth()).toBe(expected);
  });
});

describe("monthTransactions / monthTotals", () => {
  it("filters transactions to the given month and sums income/expenses separately", () => {
    const transactions = [
      { id: "t1", date: "2026-10-05", type: "entrada" as const, category: "Dízimos e ofertas", description: "a", amount: 100, method: "PIX" },
      { id: "t2", date: "2026-10-12", type: "saida" as const, category: "Contas da igreja", description: "b", amount: 40, method: "PIX" },
      { id: "t3", date: "2026-09-30", type: "entrada" as const, category: "Dízimos e ofertas", description: "c", amount: 500, method: "PIX" },
    ];
    const october = monthTransactions(transactions, "2026-10");
    expect(october).toHaveLength(2);
    expect(monthTotals(october)).toEqual({ income: 100, expenses: 40 });
  });
});

describe("averageAttendance", () => {
  it("averages attendance across past cultos in the month, ignoring other event types and future dates", () => {
    const db = baseDb({
      events: [
        { id: "e1", title: "Culto 1", type: "culto", date: "2026-10-04", time: "19:00", location: "Templo", leader: "L", attendanceIds: ["p1", "p2"], visitors: 1 },
        { id: "e2", title: "Culto 2", type: "culto", date: "2026-10-11", time: "19:00", location: "Templo", leader: "L", attendanceIds: ["p1"], visitors: 0 },
        { id: "e3", title: "Célula", type: "celula", date: "2026-10-05", time: "19:00", location: "Casa", leader: "L", attendanceIds: ["p1", "p2", "p3"], visitors: 0 },
      ],
    });
    // (3 + 1) / 2 cultos = 2
    expect(averageAttendance(db, "2026-10")).toBe(2);
  });

  it("returns 0 when there are no past cultos in the month", () => {
    const db = baseDb({ events: [] });
    expect(averageAttendance(db, "2026-10")).toBe(0);
  });
});

describe("peopleNeedingCare", () => {
  const today = new Date(2026, 9, 29); // 2026-10-29

  it("flags a visitor with no contact after 2+ days", () => {
    const db = baseDb({
      people: [basePerson({ id: "p1", stage: "visita", firstVisit: "2026-10-20", contactDates: [] })],
    });
    const result = peopleNeedingCare(db, today);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toMatch(/ainda não recebeu contato/);
  });

  it("uses the most recent event attendance as the last-seen date for a member", () => {
    const db = baseDb({
      people: [basePerson({ id: "p1", stage: "membro", firstVisit: "2020-01-01", contactDates: [] })],
      events: [
        { id: "e1", title: "Culto", type: "culto", date: "2026-10-27", time: "19:00", location: "Templo", leader: "L", attendanceIds: ["p1"], visitors: 0 },
      ],
    });
    // last seen 2 days ago -> below the 21-day threshold, should not be flagged
    expect(peopleNeedingCare(db, today)).toHaveLength(0);
  });

  it("regression: a member with no attendance record but a recent pastoral contact is not flagged purely from first visit (bug fix)", () => {
    // Reproduces the PDF-reported bug: Sônia appears "950 dias sem participar" because the
    // calculation fell back to firstVisit instead of the latest contactDates entry.
    const db = baseDb({
      people: [
        basePerson({
          id: "sonia",
          name: "Sônia Martins",
          stage: "membro",
          firstVisit: "2024-03-22",
          contactDates: ["2026-10-25"],
        }),
      ],
      events: [],
    });
    expect(peopleNeedingCare(db, today)).toHaveLength(0);
  });

  it("still flags a member whose last contact and last attendance are both old", () => {
    const db = baseDb({
      people: [
        basePerson({
          id: "p1",
          stage: "membro",
          firstVisit: "2024-01-01",
          contactDates: ["2026-01-01"],
        }),
      ],
    });
    const result = peopleNeedingCare(db, today);
    expect(result).toHaveLength(1);
    // No event attendance record exists for this person, so the reason explicitly
    // says so (distinct from the "dias sem participar" wording used when there IS
    // an attendance record that is simply old).
    expect(result[0].reason).toMatch(/sem registro de presença/i);
  });

  it("uses the 'dias sem participar' wording when an old attendance record exists", () => {
    const db = baseDb({
      people: [basePerson({ id: "p1", stage: "membro", firstVisit: "2024-01-01", contactDates: [] })],
      events: [
        { id: "e1", title: "Culto", type: "culto", date: "2026-01-01", time: "19:00", location: "Templo", leader: "L", attendanceIds: ["p1"], visitors: 0 },
      ],
    });
    const result = peopleNeedingCare(db, today);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toMatch(/dias sem participar/);
  });

  it("sorts results by descending urgency", () => {
    const db = baseDb({
      people: [
        basePerson({ id: "old", stage: "membro", firstVisit: "2024-01-01", contactDates: ["2026-01-01"] }),
        basePerson({ id: "visitor", stage: "visita", firstVisit: "2026-10-01", contactDates: [] }),
      ],
    });
    const result = peopleNeedingCare(db, today);
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].urgency).toBeGreaterThanOrEqual(result[i].urgency);
    }
  });
});
