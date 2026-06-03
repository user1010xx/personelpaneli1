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

/** Ay/yıl aralığıyla filtrelenmeyen modüller (liste tamamını gösterir) */
export function moduleUsesDateRangeFilter(moduleKey: string) {
  return moduleKey !== "PERSONEL" && moduleKey !== "UYARI_KESINTI";
}

/** Sheet/Excel satır tarih filtresi (recordDate veya createdAt fallback) */
export function moduleRowDateFilter(from: Date | null, to: Date | null) {
  const range = toDateRange(from, to);
  if (!range.from && !range.to) return null;

  return {
    OR: [
      {
        recordDate: {
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        },
      },
      {
        recordDate: null,
        createdAt: {
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        },
      },
    ],
  };
}
