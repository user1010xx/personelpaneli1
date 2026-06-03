import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { parseSheetDate } from "@/lib/sheet-parsers/utils";
import { aggregatePuantajByPersonel } from "@/lib/sheet-parsers/puantaj";

export type PuantajDailyRow = {
  personelName: string | null;
  recordDate: Date | null;
  rowData: Record<string, unknown>;
};

export type PuantajSummaryRow = {
  id: string;
  personelName: string;
  totalMesai: number;
  totalIzin: number;
  kayitliGun: number;
};

/** Filtre yoksa içinde bulunulan ayın 1'i – bugün */
export function resolvePuantajDateRange(from: Date | null, to: Date | null) {
  const anchor = new Date();
  const rangeFrom = from ? startOfDay(from) : startOfMonth(anchor);
  const rangeTo = to ? endOfDay(to) : endOfDay(anchor);
  return { from: rangeFrom, to: rangeTo };
}

function effectiveRecordDate(row: PuantajDailyRow): Date | null {
  if (row.recordDate) return row.recordDate;
  const tarih = row.rowData["Tarih"];
  if (typeof tarih === "string") return parseSheetDate(tarih);
  return null;
}

export function buildPuantajSummary(
  dailyRows: PuantajDailyRow[],
  from: Date | null,
  to: Date | null,
): PuantajSummaryRow[] {
  const { from: rangeFrom, to: rangeTo } = resolvePuantajDateRange(from, to);

  const normalized = dailyRows.map((r) => ({
    personelName: r.personelName,
    recordDate: effectiveRecordDate(r),
    rowData: r.rowData,
  }));

  const aggregated = aggregatePuantajByPersonel(normalized, rangeFrom, rangeTo);

  return aggregated.map((p) => ({
    id: `puantaj-${p.personelName}`,
    personelName: p.personelName,
    totalMesai: p.mesaiGun,
    totalIzin: p.izinGun,
    kayitliGun: p.kayitliGun,
  }));
}

export function sortPuantajSummary(
  rows: PuantajSummaryRow[],
  sortBy: string,
  sortDir: "asc" | "desc",
) {
  const list = [...rows];
  const dir = sortDir === "asc" ? 1 : -1;
  list.sort((a, b) => {
    if (sortBy === "personel") {
      return dir * a.personelName.localeCompare(b.personelName, "tr");
    }
    if (sortBy === "mesai") {
      return dir * (a.totalMesai - b.totalMesai);
    }
    if (sortBy === "izin") {
      return dir * (a.totalIzin - b.totalIzin);
    }
    return dir * a.personelName.localeCompare(b.personelName, "tr");
  });
  return list;
}

export function filterPuantajSummaryBySearch(rows: PuantajSummaryRow[], search: string) {
  const q = search.trim().toLocaleLowerCase("tr-TR");
  if (!q) return rows;
  return rows.filter((r) => r.personelName.toLocaleLowerCase("tr-TR").includes(q));
}
