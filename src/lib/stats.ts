import type { Period } from "@/lib/date-ranges";
import { getPeriodRange } from "@/lib/date-ranges";
import { extractNumericMetrics } from "@/lib/metrics";

export type StatRow = {
  recordDate: Date | null;
  createdAt: Date;
  personelName?: string | null;
  rowData: Record<string, unknown>;
};

export type ModuleStats = {
  period: Period;
  recordCount: number;
  uniquePersonel: number;
  totalPersonelCount?: number;
  averages: { key: string; value: number }[];
};

export function computeModuleStats(
  rows: StatRow[],
  period: Period,
  anchor = new Date(),
): ModuleStats {
  const { from, to } = getPeriodRange(period, anchor);

  const filtered = rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= from && date <= to;
  });

  const personelSet = new Set<string>();
  const sums = new Map<string, { total: number; count: number }>();

  for (const row of filtered) {
    const topLevel =
      typeof row.personelName === "string" && row.personelName.trim()
        ? row.personelName.trim()
        : null;
    const fromJson = row.rowData.personelName ?? row.rowData.personel;
    const personel =
      topLevel ||
      (typeof fromJson === "string" && fromJson.trim() ? fromJson.trim() : null);
    if (personel) personelSet.add(personel);

    for (const metric of extractNumericMetrics(row.rowData)) {
      const current = sums.get(metric.key) ?? { total: 0, count: 0 };
      current.total += metric.value;
      current.count += 1;
      sums.set(metric.key, current);
    }
  }

  const averages = [...sums.entries()]
    .map(([key, { total, count }]) => ({
      key,
      value: count > 0 ? Number((total / count).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.key.localeCompare(b.key, "tr"))
    .slice(0, 8);

  return {
    period,
    recordCount: filtered.length,
    uniquePersonel: personelSet.size,
    averages,
  };
}
