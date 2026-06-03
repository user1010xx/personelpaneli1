import { startOfMonth } from "date-fns";

const TR_MONTH_INDEX: Record<string, number> = {
  ocak: 0,
  subat: 1,
  mart: 2,
  nisan: 3,
  mayis: 4,
  haziran: 5,
  temmuz: 6,
  agustos: 7,
  eylul: 8,
  ekim: 9,
  kasim: 10,
  aralik: 11,
};

function normalizeTabText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Sekme adından rapor dönemi (ör. "HAZİRAN 2026" → 01.06.2026) */
export function parseSheetTabPeriodDate(sheetTab: string): Date | null {
  const text = normalizeTabText(sheetTab);
  if (!text) return null;

  let monthIdx: number | null = null;
  for (const [name, idx] of Object.entries(TR_MONTH_INDEX)) {
    if (text.includes(name)) {
      monthIdx = idx;
      break;
    }
  }
  if (monthIdx === null) return null;

  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  return startOfMonth(new Date(year, monthIdx, 1));
}
