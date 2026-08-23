import { endOfDay, startOfDay } from "date-fns";
import type { Period } from "@/lib/date-ranges";
import { getPeriodRange } from "@/lib/date-ranges";
import { displayPersonelName, normalizePersonelName } from "@/lib/utils";

export type KnowledgeDuelResult = "DOGRU" | "YANLIS";

export const KNOWLEDGE_DUEL_RESULT_LABELS: Record<KnowledgeDuelResult, string> = {
  DOGRU: "Doğru",
  YANLIS: "Yanlış",
};

export const KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE =
  "Bu personel için bu tarihte kayıt zaten var. Günlük yalnızca bir kez girilebilir.";

export type KnowledgeDuelSummaryRow = {
  personelName: string;
  dogruAdedi: number;
  yanlisAdedi: number;
  toplam: number;
};

export type KnowledgeDuelPeriodCounts = {
  toplam: number;
  dogru: number;
  yanlis: number;
  personel: number;
};

export function knowledgeDuelPersonelKey(name: string) {
  return normalizePersonelName(name);
}

export function knowledgeDuelRecordDate(date: Date) {
  return startOfDay(date);
}

export function knowledgeDuelDateRange(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: startOfDay(from) } : {}),
    ...(to ? { lte: endOfDay(to) } : {}),
  };
}

export function knowledgeDuelDayBounds(date: Date) {
  return {
    gte: startOfDay(date),
    lte: endOfDay(date),
  };
}

export function isKnowledgeDuelUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export function buildKnowledgeDuelSummary(
  rows: { personelName: string; result: KnowledgeDuelResult }[],
): KnowledgeDuelSummaryRow[] {
  const map = new Map<string, KnowledgeDuelSummaryRow>();

  for (const row of rows) {
    const key = normalizePersonelName(row.personelName);
    if (!map.has(key)) {
      map.set(key, {
        personelName: displayPersonelName(row.personelName),
        dogruAdedi: 0,
        yanlisAdedi: 0,
        toplam: 0,
      });
    }
    const entry = map.get(key)!;
    if (row.result === "DOGRU") entry.dogruAdedi += 1;
    else entry.yanlisAdedi += 1;
    entry.toplam += 1;
  }

  return [...map.values()].sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));
}

export function countKnowledgeDuelsByPeriod(
  rows: {
    personelName: string;
    result: KnowledgeDuelResult;
    recordDate: Date;
    createdAt: Date;
  }[],
  period: Period,
  anchor = new Date(),
): KnowledgeDuelPeriodCounts {
  const { from, to } = getPeriodRange(period, anchor);
  const filtered = rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= from && date <= to;
  });
  const personel = new Set(filtered.map((row) => normalizePersonelName(row.personelName)));
  let dogru = 0;
  let yanlis = 0;
  for (const row of filtered) {
    if (row.result === "DOGRU") dogru += 1;
    else yanlis += 1;
  }
  return {
    toplam: filtered.length,
    dogru,
    yanlis,
    personel: personel.size,
  };
}
