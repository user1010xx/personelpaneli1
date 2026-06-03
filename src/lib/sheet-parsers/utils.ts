import { parse, isValid } from "date-fns";

export type ParsedSheetRow = {
  personelName: string | null;
  recordDate: Date | null;
  rowData: Record<string, string>;
};

export function normalizeHeader(h: string) {
  return h
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function headerIndex(headers: string[], ...candidates: string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const c = normalizeHeader(candidate);
    const idx = normalized.findIndex((h) => h === c || h.includes(c) || c.includes(h));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function cellStr(row: unknown[], index: number) {
  if (index < 0 || index >= row.length) return "";
  const v = row[index];
  return v == null ? "" : String(v).trim();
}

export function parseSheetDate(value: string): Date | null {
  if (!value) return null;
  const formats = ["dd.MM.yyyy", "d.M.yyyy", "yyyy-MM-dd", "dd/MM/yyyy"];
  for (const fmt of formats) {
    const d = parse(value.trim(), fmt, new Date());
    if (isValid(d)) return d;
  }
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

export function recordFromHeaders(headers: string[], row: unknown[]) {
  const rowData: Record<string, string> = {};
  headers.forEach((header, index) => {
    const key = header?.trim() || `Kolon_${index + 1}`;
    rowData[key] = cellStr(row, index);
  });
  return rowData;
}
