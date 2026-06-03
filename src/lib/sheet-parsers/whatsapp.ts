import type { ParsedSheetRow } from "@/lib/sheet-parsers/utils";
import { cellStr, headerIndex } from "@/lib/sheet-parsers/utils";
import { parseSheetTabPeriodDate } from "@/lib/sheet-parsers/whatsapp-period";
import { sheetPersonelName } from "@/lib/utils";

export type WhatsappParseContext = {
  sheetTab?: string;
};

function parseNumber(value: string) {
  if (!value || value.startsWith("#")) return null;
  const n = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Yalnızca özet kolonlar: personel, ortalama cevapsız, toplam cevapsız.
 * Günlük tarih kolonları saklanmaz (sheet'e günlük eklense bile özet satırı kullanılır).
 * recordDate: sekme adındaki ay/yıl (ör. HAZİRAN 2026); yoksa null.
 */
export function parseWhatsappSheet(
  headers: string[],
  dataRows: unknown[][],
  context: WhatsappParseContext = {},
): ParsedSheetRow[] {
  const personelIdx = headerIndex(
    headers,
    "personel adi",
    "personel adı",
    "personel",
    "isim",
    "ad soyad",
    "ad soyadi",
  );
  const ortIdx = headerIndex(
    headers,
    "ortalama whatsapp cevapsiz",
    "ortalama whatsapp cevapsız",
    "ortalama cevapsiz",
    "ortalama cevapsız",
    "ortalama",
  );
  const totalIdx = headerIndex(
    headers,
    "total whatsapp cevapsiz",
    "total whatsapp cevapsız",
    "toplam whatsapp cevapsiz",
    "toplam whatsapp cevapsız",
    "total",
    "toplam",
  );
  const effectivePersonelIdx = personelIdx >= 0 ? personelIdx : 0;
  const effectiveOrtIdx = ortIdx >= 0 ? ortIdx : 3;
  const effectiveTotalIdx = totalIdx >= 0 ? totalIdx : 4;

  const recordDate = context.sheetTab
    ? parseSheetTabPeriodDate(context.sheetTab)
    : null;
  const donemLabel = context.sheetTab?.trim() || null;

  const out: ParsedSheetRow[] = [];

  for (const row of dataRows) {
    const rawName = cellStr(row, effectivePersonelIdx);
    const personelName = sheetPersonelName(rawName);
    if (!personelName) continue;

    const ortalama = cellStr(row, effectiveOrtIdx);
    const toplam = cellStr(row, effectiveTotalIdx);

    const ortNum = parseNumber(ortalama);
    const topNum = parseNumber(toplam);

    const rowData: Record<string, string> = {
      "Ortalama WhatsApp Cevapsız": ortNum != null ? String(ortNum) : ortalama,
      "Total WhatsApp Cevapsız": topNum != null ? String(topNum) : toplam,
    };
    if (donemLabel) rowData["Dönem"] = donemLabel;

    out.push({
      personelName,
      recordDate,
      rowData,
    });
  }

  return out;
}
