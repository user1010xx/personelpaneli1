import type { ParsedSheetRow } from "@/lib/sheet-parsers/utils";
import {
  cellStr,
  headerIndex,
  normalizeHeader,
  parseSheetDate,
  recordFromHeaders,
} from "@/lib/sheet-parsers/utils";
import { sheetPersonelName } from "@/lib/utils";

/** Personel listesi tablo sütun sırası */
export const PERSONEL_COLUMN_LABELS = [
  "Personel Adı",
  "Kullanıcı adı",
  "İşe giriş Tarihi",
  "Mail",
  "Referans",
  "Terfi Tarihi",
] as const;

export type PersonelColumnLabel = (typeof PERSONEL_COLUMN_LABELS)[number];

/** Sheet başlığını kanonik sütun adına eşler */
export function matchPersonelColumn(header: string): PersonelColumnLabel | null {
  const n = normalizeHeader(header);
  if (!n) return null;
  if (n.includes("personel adi") || n === "personel") return "Personel Adı";
  if (
    n.includes("kullanici adi") ||
    n.includes("kullanıcı adı") ||
    n.includes("tg adres") ||
    n.includes("telegram") ||
    n.includes("tg user")
  ) {
    return "Kullanıcı adı";
  }
  if (n.includes("ise giris") || n.includes("işe giriş") || n.includes("giris tarihi")) {
    return "İşe giriş Tarihi";
  }
  if (
    n === "mail" ||
    n.includes("mail adres") ||
    n === "e posta" ||
    n === "eposta" ||
    n === "e-mail"
  ) {
    return "Mail";
  }
  if (n.includes("referans") || n.includes("getiren personel")) return "Referans";
  if (n.includes("terfi") || n.includes("tefi tarih")) return "Terfi Tarihi";
  return null;
}

export function normalizePersonelRowData(
  rowData: Record<string, string>,
): Record<PersonelColumnLabel, string> {
  const out = {} as Record<PersonelColumnLabel, string>;
  for (const [key, value] of Object.entries(rowData)) {
    const label = matchPersonelColumn(key);
    if (!label) continue;
    const trimmed = value.trim();
    if (trimmed) out[label] = trimmed;
  }
  return out;
}

export function getPersonelFieldValue(
  row: { personelName?: string | null; data?: Record<string, string> },
  label: PersonelColumnLabel,
): string {
  const data = row.data ?? {};
  if (data[label]?.trim()) return data[label].trim();

  for (const [key, value] of Object.entries(data)) {
    if (matchPersonelColumn(key) === label && value.trim()) return value.trim();
  }

  if (label === "Personel Adı") {
    return row.personelName?.trim() ?? "";
  }
  return "";
}

export function personelRowToExportRecord(
  row: { personelName?: string | null; data?: Record<string, string> },
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const label of PERSONEL_COLUMN_LABELS) {
    record[label] = getPersonelFieldValue(row, label);
  }
  return record;
}

/** Personel listesi: kanonik kolonlarla saklanır */
export function parsePersonelSheet(
  headers: string[],
  dataRows: unknown[][],
): ParsedSheetRow[] {
  const personelIdx = headerIndex(headers, "personel adi", "personel adı", "personel");
  const girisIdx = headerIndex(headers, "ise giris tarihi", "işe giriş tarihi", "giris tarihi");

  return dataRows.map((row) => {
    const raw = recordFromHeaders(headers, row);
    const normalized = normalizePersonelRowData(raw);
    const personelName =
      (personelIdx >= 0 ? sheetPersonelName(cellStr(row, personelIdx)) : null) ||
      normalized["Personel Adı"] ||
      null;
    if (personelName) normalized["Personel Adı"] = personelName;

    const rowData: Record<string, string> = {};
    for (const label of PERSONEL_COLUMN_LABELS) {
      if (normalized[label]) rowData[label] = normalized[label];
    }

    const recordDate =
      (girisIdx >= 0 ? parseSheetDate(cellStr(row, girisIdx)) : null) ??
      parseSheetDate(rowData["İşe giriş Tarihi"] ?? "");

    return {
      personelName: personelName || null,
      recordDate,
      rowData,
    };
  });
}
