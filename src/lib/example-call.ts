import { endOfDay, startOfDay } from "date-fns";
import type { Period } from "@/lib/date-ranges";
import { getPeriodRange } from "@/lib/date-ranges";
import { normalizePersonelName } from "@/lib/utils";

export type ExampleCallSummaryRow = {
  personelName: string;
  adet: number;
};

export type ExampleCallPeriodCounts = {
  toplam: number;
  personel: number;
};

export function exampleCallDateRange(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: startOfDay(from) } : {}),
    ...(to ? { lte: endOfDay(to) } : {}),
  };
}

export function buildExampleCallSummary(
  rows: { personelName: string }[],
): ExampleCallSummaryRow[] {
  const map = new Map<string, ExampleCallSummaryRow>();

  for (const row of rows) {
    const key = normalizePersonelName(row.personelName);
    if (!map.has(key)) {
      map.set(key, { personelName: row.personelName.trim(), adet: 0 });
    }
    map.get(key)!.adet += 1;
  }

  return [...map.values()].sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));
}

export function countExampleCallsByPeriod(
  rows: { personelName: string; recordDate: Date; createdAt: Date }[],
  period: Period,
  anchor = new Date(),
): ExampleCallPeriodCounts {
  const { from, to } = getPeriodRange(period, anchor);
  const filtered = rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= from && date <= to;
  });
  const personel = new Set(filtered.map((row) => normalizePersonelName(row.personelName)));
  return { toplam: filtered.length, personel: personel.size };
}
