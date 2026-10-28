import {
  differenceInCalendarDays,
  differenceInHours,
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return isValid(date) ? format(date, "dd/MM/yyyy") : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return isValid(date) ? format(date, "dd/MM/yyyy 'às' HH:mm") : "—";
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return isValid(date) ? format(date, "dd MMM", { locale: ptBR }) : "—";
}

export function formatMonth(value: string | Date): string {
  const date = toDate(value);
  return isValid(date) ? format(date, "MMM", { locale: ptBR }) : "";
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

export function daysUntil(value: string | Date): number {
  return differenceInCalendarDays(toDate(value), new Date());
}

export function hoursBetween(start: string, end: string): number {
  return Math.max(0, differenceInHours(toDate(end), toDate(start)));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toDateInput(value: string | Date): string {
  const date = toDate(value);
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDaysISO(days: number, base = new Date()): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

export function addDaysToDate(value: string, days: number): string {
  const date = toDate(value);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

export function shiftISO(
  days: number,
  hour = 9,
  minute = 0,
  base = new Date(),
): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
