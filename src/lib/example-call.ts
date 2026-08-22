import { endOfDay, startOfDay } from "date-fns";
import type { Period } from "@/lib/date-ranges";
import { getPeriodRange } from "@/lib/date-ranges";
import { normalizePersonelName } from "@/lib/utils";

export type ExampleCallType = "ORNEK_CAGRI" | "MOTIVASYON";

export const EXAMPLE_CALL_TYPE_LABELS: Record<ExampleCallType, string> = {
  ORNEK_CAGRI: "Örnek Çağrı",
  MOTIVASYON: "Motivasyon",
};

export type ExampleCallSummaryRow = {
  personelName: string;
  ornekCagriAdedi: number;
  motivasyonAdedi: number;
};

export type ExampleCallPeriodCounts = {
  toplam: number;
  ornekCagri: number;
  motivasyon: number;
  personel: number;
};

export function exampleCallDateRange(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: startOfDay(from) } : {}),
    ...(to ? { lte: endOfDay(to) } : {}),
  };
}

export function buildExampleCallSummary(
  rows: { personelName: string; recordType?: ExampleCallType }[],
): ExampleCallSummaryRow[] {
  const map = new Map<string, ExampleCallSummaryRow>();

  for (const row of rows) {
    const key = normalizePersonelName(row.personelName);
    if (!map.has(key)) {
      map.set(key, {
        personelName: row.personelName.trim(),
        ornekCagriAdedi: 0,
        motivasyonAdedi: 0,
      });
    }
    const entry = map.get(key)!;
    if (row.recordType === "MOTIVASYON") entry.motivasyonAdedi += 1;
    else entry.ornekCagriAdedi += 1;
  }

  return [...map.values()].sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));
}

export function countExampleCallsByPeriod(
  rows: {
    personelName: string;
    recordType?: ExampleCallType;
    recordDate: Date;
    createdAt: Date;
  }[],
  period: Period,
  anchor = new Date(),
): ExampleCallPeriodCounts {
  const { from, to } = getPeriodRange(period, anchor);
  const filtered = rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= from && date <= to;
  });
  const personel = new Set(filtered.map((row) => normalizePersonelName(row.personelName)));
  let ornekCagri = 0;
  let motivasyon = 0;
  for (const row of filtered) {
    if (row.recordType === "MOTIVASYON") motivasyon += 1;
    else ornekCagri += 1;
  }
  return {
    toplam: filtered.length,
    ornekCagri,
    motivasyon,
    personel: personel.size,
  };
}
