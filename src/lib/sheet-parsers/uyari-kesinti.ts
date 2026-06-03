import type { ParsedSheetRow } from "@/lib/sheet-parsers/utils";
import { cellStr, headerIndex, parseSheetDate, recordFromHeaders } from "@/lib/sheet-parsers/utils";
import { sheetPersonelName } from "@/lib/utils";

/** Kesinti boşsa uyarı; "1 GÜN", "2 gün" vb. varsa kesinti. */
export function classifyUyariKesinti(kesintiRaw: string): "UYARI" | "KESINTI" {
  const t = kesintiRaw.trim();
  if (!t) return "UYARI";
  if (/\d+\s*g[uü]n/i.test(t)) return "KESINTI";
  return "UYARI";
}

export function parseUyariKesintiSheet(
  headers: string[],
  dataRows: unknown[][],
): ParsedSheetRow[] {
  const personelIdx = headerIndex(headers, "personel adi", "personel adı");
  const kesintiIdx = headerIndex(headers, "kesinti", "kesıntı");
  const konuIdx = headerIndex(headers, "konu");
  const tarihIdx = headerIndex(headers, "tarih");

  return dataRows.map((row) => {
    const rowData = recordFromHeaders(headers, row);
    const kesinti = kesintiIdx >= 0 ? cellStr(row, kesintiIdx) : rowData["KESİNTİ"] ?? rowData["KESINTI"] ?? "";
    const kayitTuru = classifyUyariKesinti(kesinti);

    rowData["Kayıt Türü"] = kayitTuru === "UYARI" ? "Uyarı" : "Kesinti";
    rowData["KESİNTİ"] = kesinti;
    if (konuIdx >= 0) rowData["KONU"] = cellStr(row, konuIdx);
    if (tarihIdx >= 0) rowData["TARİH"] = cellStr(row, tarihIdx);

    const personelName =
      personelIdx >= 0 ? sheetPersonelName(cellStr(row, personelIdx)) : null;
    const recordDate = tarihIdx >= 0 ? parseSheetDate(cellStr(row, tarihIdx)) : null;

    return {
      personelName,
      recordDate,
      rowData,
    };
  });
}
