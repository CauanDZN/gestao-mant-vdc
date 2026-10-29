import { describe, expect, it } from "vitest";
import { churchSnapshotSchema } from "@/lib/church-validation";

function validSnapshot() {
  return {
    version: 3,
    data: {
      version: 1 as const,
      settings: { churchName: "Igreja Teste", location: "Cidade", monthlyGoal: 5000, openingBalance: 1000 },
      transactions: [
        { id: "t1", date: "2026-10-01", type: "entrada", category: "Dízimos e ofertas", description: "Culto", amount: 100, method: "PIX" },
      ],
      assets: [],
      events: [],
      people: [
        {
          id: "p1",
          name: "Ana",
          phone: "",
          email: "",
          birthday: "",
          stage: "membro",
          group: "",
          firstVisit: "2024-01-01",
          notes: "",
          contactDates: [],
          cellId: null,
        },
      ],
      commitments: [],
      counters: { transaction: 2, asset: 1, event: 1, person: 2 },
    },
  };
}

describe("churchSnapshotSchema", () => {
  it("accepts a well-formed snapshot", () => {
    const result = churchSnapshotSchema.safeParse(validSnapshot());
    expect(result.success).toBe(true);
  });

  it("accepts a person without cellId (optional field, backward compatible)", () => {
    const snapshot = validSnapshot();
    delete (snapshot.data.people[0] as { cellId?: string | null }).cellId;
    const result = churchSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid transaction type", () => {
    const snapshot = validSnapshot();
    (snapshot.data.transactions[0] as { type: string }).type = "transferencia";
    const result = churchSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const snapshot = validSnapshot();
    snapshot.data.transactions[0].date = "28/10/2026";
    const result = churchSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it("rejects unknown extra fields (strict schema)", () => {
    const snapshot = validSnapshot() as Record<string, unknown>;
    snapshot.extra = "not allowed";
    const result = churchSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const snapshot = validSnapshot();
    snapshot.data.transactions[0].amount = -5;
    const result = churchSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });
});
