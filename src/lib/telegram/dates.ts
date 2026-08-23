import { endOfDay, startOfDay } from "date-fns";
import { formatAppDate, formatAppDateTime } from "@/lib/timezone";

const TR_DATE = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTelegramDay(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;

  const tr = TR_DATE.exec(text);
  if (tr) {
    const day = Number(tr[1]);
    const month = Number(tr[2]);
    const year = Number(tr[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  const iso = ISO_DATE.exec(text);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  return null;
}

export function parseTelegramDateRange(raw: string): { from: Date; to: Date } | null {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return null;

  const split = text.split(/\s*(?:-|–|—|\/|ile)\s*/i).filter(Boolean);
  if (split.length === 2) {
    const first = parseTelegramDay(split[0]);
    const second = parseTelegramDay(split[1]);
    if (!first || !second) return null;
    const from = first <= second ? first : second;
    const to = first <= second ? second : first;
    return { from: startOfDay(from), to: endOfDay(to) };
  }

  const spaced = text.split(" ");
  if (spaced.length === 2) {
    const first = parseTelegramDay(spaced[0]);
    const second = parseTelegramDay(spaced[1]);
    if (first && second) {
      const from = first <= second ? first : second;
      const to = first <= second ? second : first;
      return { from: startOfDay(from), to: endOfDay(to) };
    }
  }

  const single = parseTelegramDay(text);
  if (!single) return null;
  return { from: startOfDay(single), to: endOfDay(single) };
}

export function formatTelegramDay(date: Date) {
  return formatAppDate(date);
}

export function formatTelegramDateTime(date: Date) {
  return formatAppDateTime(date);
}

export function formatRangeLabel(from: Date, to: Date) {
  const a = formatTelegramDay(from);
  const b = formatTelegramDay(to);
  return a === b ? a : `${a} — ${b}`;
}
