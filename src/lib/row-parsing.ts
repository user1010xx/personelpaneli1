import { parse, isValid } from "date-fns";

const DATE_KEYS = [
  "tarih",
  "date",
  "gun",
  "gün",
  "kayit_tarihi",
  "kayıt tarihi",
  "record_date",
  "islem_tarihi",
  "işlem tarihi",
];

const PERSONEL_KEYS = [
  "personel",
  "personel adi",
  "personel adı",
  "personel_adi",
  "personel_adı",
  "ad soyad",
  "ad_soyad",
  "isim",
  "çalışan",
  "calisan",
  "agent",
  "temsilci",
];

function strictParsing() {
  return process.env.STRICT_ROW_PARSING === "true";
}

function normalizeKey(key: string) {
  return key.trim().toLocaleLowerCase("tr-TR");
}

export function parseRowRecordDate(
  row: Record<string, unknown>,
  options: { fallback?: boolean } = {},
): Date | null {
  for (const [key, raw] of Object.entries(row)) {
    if (!DATE_KEYS.includes(normalizeKey(key))) continue;
    const parsed = parseFlexibleDate(raw);
    if (parsed) return parsed;
  }

  if (strictParsing() || options.fallback === false) return null;

  for (const raw of Object.values(row)) {
    const parsed = parseFlexibleDate(raw);
    if (parsed) return parsed;
  }

  return null;
}

export function parseRowPersonelName(row: Record<string, unknown>): string | null {
  for (const [key, raw] of Object.entries(row)) {
    if (!PERSONEL_KEYS.includes(normalizeKey(key))) continue;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }

  if (strictParsing()) return null;

  for (const raw of Object.values(row)) {
    if (typeof raw === "string" && raw.trim().length > 2) {
      const lower = raw.toLocaleLowerCase("tr-TR");
      if (!lower.includes("@") && !/^\d+([.,]\d+)?$/.test(raw.trim())) {
        return raw.trim();
      }
    }
  }

  return null;
}

function parseFlexibleDate(value: unknown): Date | null {
  if (value instanceof Date && isValid(value)) return value;
  if (typeof value === "number" && value > 25569) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isValid(date) ? date : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  const formats = [
    "dd.MM.yyyy",
    "d.M.yyyy",
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd.MM.yyyy HH:mm",
    "yyyy-MM-dd'T'HH:mm:ss",
  ];

  for (const fmt of formats) {
    const parsed = parse(text, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

export function rowToRecord(row: unknown[]): Record<string, string> {
  return Object.fromEntries(
    row.map((cell, index) => [`col_${index + 1}`, cell == null ? "" : String(cell)]),
  );
}

export function headersToRecord(headers: string[], row: unknown[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    const key = header?.trim() || `col_${index + 1}`;
    record[key] = row[index] == null ? "" : String(row[index]);
  });
  return record;
}

export { extractNumericMetrics } from "@/lib/metrics";
