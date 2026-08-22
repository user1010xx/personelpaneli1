import { endOfDay, startOfDay } from "date-fns";
import { normalizePersonelName } from "@/lib/utils";

export type QualitySummaryRow = {
  personelName: string;
  adet: number;
  ortalama: number;
};

export function qualityDateRange(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: startOfDay(from) } : {}),
    ...(to ? { lte: endOfDay(to) } : {}),
  };
}

export function buildQualitySummary(
  rows: { personelName: string; score: number }[],
): QualitySummaryRow[] {
  const map = new Map<string, { personelName: string; adet: number; total: number }>();

  for (const row of rows) {
    const key = normalizePersonelName(row.personelName);
    const display = row.personelName.trim();
    if (!map.has(key)) {
      map.set(key, { personelName: display, adet: 0, total: 0 });
    }
    const entry = map.get(key)!;
    entry.adet += 1;
    entry.total += row.score;
  }

  return [...map.values()]
    .map((e) => ({
      personelName: e.personelName,
      adet: e.adet,
      ortalama: e.adet > 0 ? Number((e.total / e.adet).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));
}

export function averageScore(rows: { score: number }[]) {
  if (rows.length === 0) return 0;
  const total = rows.reduce((a, r) => a + r.score, 0);
  return Number((total / rows.length).toFixed(2));
}
