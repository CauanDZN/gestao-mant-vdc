import type { ChurchDatabase, ChurchPerson, FinancialTransaction } from "./types";

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatMonthLabel(month: string): string {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, value - 1, 1));
}

export function shiftMonth(month: string, offset: number): string {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(year, value - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthTransactions(
  transactions: FinancialTransaction[],
  month: string,
): FinancialTransaction[] {
  return transactions.filter((item) => monthKey(item.date) === month);
}

export function monthTotals(transactions: FinancialTransaction[]): {
  income: number;
  expenses: number;
} {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === "entrada") totals.income += transaction.amount;
      else totals.expenses += transaction.amount;
      return totals;
    },
    { income: 0, expenses: 0 },
  );
}

export function peopleNeedingCare(
  db: ChurchDatabase,
  today = new Date(),
): Array<{ person: ChurchPerson; reason: string; urgency: number }> {
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const lastSeen = new Map<string, string>();
  for (const event of db.events) {
    if (event.date > todayKey) continue;
    for (const id of event.attendanceIds) {
      if (!lastSeen.has(id) || lastSeen.get(id)! < event.date) {
        lastSeen.set(id, event.date);
      }
    }
  }
  const daysBetween = (date: string) =>
    Math.floor((Date.parse(`${todayKey}T12:00:00`) - Date.parse(`${date}T12:00:00`)) / 86_400_000);

  return db.people
    .flatMap((person) => {
      if (person.stage === "visita" && person.contactDates.length === 0) {
        const days = daysBetween(person.firstVisit);
        if (days >= 2) {
          return [{ person, reason: "Visitou e ainda não recebeu contato", urgency: days + 30 }];
        }
      }
      if (person.stage === "membro" || person.stage === "frequentador") {
        const lastContact = person.contactDates.reduce(
          (latest, date) => (date > latest ? date : latest),
          "",
        );
        const last = [lastSeen.get(person.id), lastContact, person.firstVisit]
          .filter((value): value is string => Boolean(value))
          .reduce((latest, date) => (date > latest ? date : latest));
        const hasAttendanceRecord = lastSeen.has(person.id);
        const days = daysBetween(last);
        if (days >= 21) {
          return [{
            person,
            reason: hasAttendanceRecord
              ? `Há ${days} dias sem participar`
              : `Sem registro de presença — ${days} dias desde o último contato`,
            urgency: days,
          }];
        }
      }
      return [];
    })
    .sort((a, b) => b.urgency - a.urgency);
}

export function averageAttendance(
  db: ChurchDatabase,
  month: string,
): number {
  const cults = db.events.filter(
    (event) =>
      monthKey(event.date) === month &&
      event.date <= new Date().toISOString().slice(0, 10) &&
      event.type === "culto",
  );
  if (cults.length === 0) return 0;
  return Math.round(
    cults.reduce(
      (total, event) => total + event.attendanceIds.length + event.visitors,
      0,
    ) / cults.length,
  );
}

export function relativeDate(days: number, base = new Date()): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
