import { endOfDay, startOfDay } from "date-fns";
import type { TrainingRecordType } from "@prisma/client";
import type { Period } from "@/lib/date-ranges";
import { getPeriodRange } from "@/lib/date-ranges";
import { normalizePersonelName } from "@/lib/utils";

export type TrainingPeriodCounts = {
  egitim: number;
  geribildirim: number;
  toplam: number;
  personel: number;
};

export type TrainingSummaryRow = {
  personelName: string;
  egitimAdedi: number;
  geribildirimAdedi: number;
};

export function buildTrainingSummary(
  rows: { personelName: string; recordType: TrainingRecordType }[],
): TrainingSummaryRow[] {
  const map = new Map<string, TrainingSummaryRow>();

  for (const row of rows) {
    const key = normalizePersonelName(row.personelName);
    const display = row.personelName.trim();
    if (!map.has(key)) {
      map.set(key, { personelName: display, egitimAdedi: 0, geribildirimAdedi: 0 });
    }
    const entry = map.get(key)!;
    if (row.recordType === "GERIBILDIRIM") {
      entry.geribildirimAdedi += 1;
    } else {
      entry.egitimAdedi += 1;
    }
  }

  return [...map.values()].sort((a, b) =>
    a.personelName.localeCompare(b.personelName, "tr"),
  );
}

export function trainingDateRange(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: startOfDay(from) } : {}),
    ...(to ? { lte: endOfDay(to) } : {}),
  };
}

export const TRAINING_RECORD_LABELS: Record<TrainingRecordType, string> = {
  EGITIM: "Eğitim",
  GERIBILDIRIM: "Geribildirim",
};

export function countTrainingByPeriod(
  rows: {
    personelName: string;
    recordType: TrainingRecordType;
    recordDate: Date;
    createdAt: Date;
  }[],
  period: Period,
  anchor = new Date(),
): TrainingPeriodCounts {
  const { from, to } = getPeriodRange(period, anchor);
  const filtered = rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= from && date <= to;
  });

  const personel = new Set<string>();
  let egitim = 0;
  let geribildirim = 0;

  for (const row of filtered) {
    personel.add(normalizePersonelName(row.personelName));
    if (row.recordType === "GERIBILDIRIM") geribildirim += 1;
    else egitim += 1;
  }

  return {
    egitim,
    geribildirim,
    toplam: filtered.length,
    personel: personel.size,
  };
}
