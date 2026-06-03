import { endOfMonth, format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { parseDateInput } from "@/lib/date-parse";

export const MONTH_OPTIONS = [
  { value: 1, label: "Ocak" },
  { value: 2, label: "Şubat" },
  { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" },
  { value: 5, label: "Mayıs" },
  { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" },
  { value: 8, label: "Ağustos" },
  { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" },
  { value: 11, label: "Kasım" },
  { value: 12, label: "Aralık" },
] as const;

export function currentMonthYear(anchor = new Date()) {
  return { month: anchor.getMonth() + 1, year: anchor.getFullYear() };
}

export function yearOptions(anchorYear = new Date().getFullYear(), past = 8, future = 1) {
  const years: number[] = [];
  for (let y = anchorYear - past; y <= anchorYear + future; y += 1) {
    years.push(y);
  }
  return years.sort((a, b) => b - a);
}

/** yyyy-MM-dd — ayın ilk ve son günü */
export function monthYearToIsoRange(month: number, year: number) {
  const m = Math.min(12, Math.max(1, month));
  const y = year;
  const start = startOfMonth(new Date(y, m - 1, 1));
  const end = endOfMonth(start);
  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}

export function formatMonthYearLabel(month: number, year: number) {
  const m = Math.min(12, Math.max(1, month));
  const date = new Date(year, m - 1, 1);
  return format(date, "MMMM yyyy", { locale: tr });
}

/** Eski from/to veya ay-yıl state → tek tip */
export function resolveMonthYear(input: {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
}) {
  if (
    typeof input.month === "number" &&
    input.month >= 1 &&
    input.month <= 12 &&
    typeof input.year === "number" &&
    input.year >= 2000
  ) {
    return { month: input.month, year: input.year };
  }

  const parsed = parseDateInput(input.from ?? input.to ?? null);
  if (parsed) {
    return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };
  }

  return currentMonthYear();
}
