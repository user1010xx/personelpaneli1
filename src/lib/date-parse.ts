import { endOfDay, startOfDay } from "date-fns";

/** ISO yyyy-MM-dd veya parse edilebilir tarih → gün başlangıcı */
export function parseDateInput(value: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDay) {
    const date = new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateRange(from: Date | null, to: Date | null) {
  return {
    from: from ? startOfDay(from) : null,
    to: to ? endOfDay(to) : null,
  };
}
