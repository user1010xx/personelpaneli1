import { endOfDay, startOfDay } from "date-fns";
import { normalizePersonelName } from "@/lib/utils";

export type InitiativeWorkSummaryRow = {
  personelName: string;
  calismaAdedi: number;
};

export function initiativeWorkDateRange(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: startOfDay(from) } : {}),
    ...(to ? { lte: endOfDay(to) } : {}),
  };
}

export function buildInitiativeWorkSummary(
  rows: { personelName: string }[],
): InitiativeWorkSummaryRow[] {
  const map = new Map<string, InitiativeWorkSummaryRow>();

  for (const row of rows) {
    const key = normalizePersonelName(row.personelName);
    if (!map.has(key)) {
      map.set(key, { personelName: row.personelName.trim(), calismaAdedi: 0 });
    }
    map.get(key)!.calismaAdedi += 1;
  }

  return [...map.values()].sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));
}

export function parseWorkDuration(value: string) {
  const text = value.trim();
  if (!text) return null;

  const timeMatch = /^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/.exec(text);
  if (timeMatch) {
    const first = Number(timeMatch[1]);
    const second = Number(timeMatch[2]);
    const third = timeMatch[3] ? Number(timeMatch[3]) : null;
    return third === null ? first * 60 + second : first * 3600 + second * 60 + third;
  }

  const normalized = text.replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Math.round(Number(normalized));
  }

  return null;
}

export function formatWorkDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}