import type { ModuleKey } from "@prisma/client";
import type { ParsedSheetRow } from "@/lib/sheet-parsers/utils";
import {
  PERSONEL_COLUMN_LABELS,
  parsePersonelSheet,
} from "@/lib/sheet-parsers/personel";
import { parsePuantajSheet } from "@/lib/sheet-parsers/puantaj";
import { parseUyariKesintiSheet } from "@/lib/sheet-parsers/uyari-kesinti";
import { parseWhatsappSheet } from "@/lib/sheet-parsers/whatsapp";
import { recordFromHeaders } from "@/lib/sheet-parsers/utils";
import { parseRowPersonelName, parseRowRecordDate } from "@/lib/row-parsing";

export type { ParsedSheetRow } from "@/lib/sheet-parsers/utils";
export {
  PERSONEL_COLUMN_LABELS,
  getPersonelFieldValue,
  matchPersonelColumn,
  normalizePersonelRowData,
  parsePersonelSheet,
  personelRowToExportRecord,
} from "@/lib/sheet-parsers/personel";
export type { PersonelColumnLabel } from "@/lib/sheet-parsers/personel";
export { parseUyariKesintiSheet, classifyUyariKesinti } from "@/lib/sheet-parsers/uyari-kesinti";
export { parsePuantajSheet, aggregatePuantajByPersonel, parsePuantajCell } from "@/lib/sheet-parsers/puantaj";
export { parseWhatsappSheet } from "@/lib/sheet-parsers/whatsapp";

export type ParseSheetContext = {
  sheetTab?: string;
};

export function parseSheetRows(
  moduleKey: ModuleKey,
  headers: string[],
  dataRows: unknown[][],
  context: ParseSheetContext = {},
): ParsedSheetRow[] {
  switch (moduleKey) {
    case "PERSONEL":
      return parsePersonelSheet(headers, dataRows);
    case "UYARI_KESINTI":
      return parseUyariKesintiSheet(headers, dataRows);
    case "PUANTAJ":
      return parsePuantajSheet(headers, dataRows);
    case "WHATSAPP":
      return parseWhatsappSheet(headers, dataRows, { sheetTab: context.sheetTab });
    default:
      return dataRows.map((row) => {
        const rowData = recordFromHeaders(headers, row);
        return {
          personelName: parseRowPersonelName(rowData),
          recordDate: parseRowRecordDate(rowData),
          rowData,
        };
      });
  }
}

/** Modül sayfasında gösterilecek kolon sırası */
export function displayColumnsForModule(
  moduleKey: ModuleKey,
  rows: { data?: Record<string, string> }[],
): string[] {
  if (moduleKey === "WHATSAPP") {
    const cols = ["Ortalama WhatsApp Cevapsız", "Total WhatsApp Cevapsız"];
    const hasDonem = rows.some((r) => r.data?.["Dönem"]);
    return hasDonem ? ["Dönem", ...cols] : cols;
  }
  if (moduleKey === "PUANTAJ") {
    return ["Total Mesai", "Total İzin"];
  }
  if (moduleKey === "UYARI_KESINTI") {
    const keys = new Set<string>();
    for (const row of rows) {
      Object.keys(row.data ?? {}).forEach((k) => keys.add(k));
    }
    const preferred = ["Kayıt Türü", "KESİNTİ", "KONU", "TARİH"];
    const rest = [...keys].filter(
      (k) => !preferred.includes(k) && !/personel/i.test(k),
    );
    return [...preferred.filter((k) => keys.has(k)), ...rest];
  }
  if (moduleKey === "PERSONEL") {
    return [...PERSONEL_COLUMN_LABELS];
  }
  const keys = new Set<string>();
  for (const row of rows) {
    Object.keys(row.data ?? {}).forEach((k) => keys.add(k));
  }
  return [...keys].slice(0, 12);
}
