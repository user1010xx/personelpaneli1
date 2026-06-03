import type { sheets_v4 } from "googleapis";

/** Google Sheets A1 aralığı — sekme adı özel karakter içeriyorsa tırnaklanır */
export function formatSheetA1Range(sheetTitle: string, cellRange = "A:ZZZ") {
  const title = sheetTitle.trim();
  if (!title) return cellRange;

  const escaped = title.replace(/'/g, "''");
  const needsQuotes = /[^A-Za-z0-9_]/.test(title) || /^\d/.test(title);
  const sheetPart = needsQuotes ? `'${escaped}'` : escaped;
  return `${sheetPart}!${cellRange}`;
}

export async function listSpreadsheetTabTitles(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<string[]> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  return (
    meta.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t?.trim())) ?? []
  );
}

function pickTabTitle(requested: string, available: string[]): string {
  const req = requested.trim();
  if (!req) return available[0] ?? "";

  if (available.includes(req)) return req;

  const lower = req.toLocaleLowerCase("tr-TR");
  const ci = available.find((t) => t.toLocaleLowerCase("tr-TR") === lower);
  if (ci) return ci;

  // Sheet1 ↔ Sayfa1 (locale default tab)
  if (lower === "sheet1") {
    const sayfa1 = available.find((t) => t.toLocaleLowerCase("tr-TR") === "sayfa1");
    if (sayfa1) return sayfa1;
  }
  if (lower === "sayfa1") {
    const sheet1 = available.find((t) => t.toLocaleLowerCase("tr-TR") === "sheet1");
    if (sheet1) return sheet1;
  }

  if (available.length === 1) return available[0];

  return "";
}

/**
 * config.range doluysa onu kullanır.
 * Değilse dosyadaki gerçek sekme adını bulur (Sheet1/Sayfa1 uyumu dahil).
 */
export async function resolveSpreadsheetReadRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  options: { sheetName: string; range: string | null },
): Promise<{ range: string; tabTitle: string; availableTabs: string[] }> {
  const custom = options.range?.trim();
  if (custom) {
    return { range: custom, tabTitle: options.sheetName, availableTabs: [] };
  }

  const availableTabs = await listSpreadsheetTabTitles(sheets, spreadsheetId);
  if (availableTabs.length === 0) {
    throw new Error("Spreadsheet içinde sekme bulunamadı");
  }

  const tabTitle = pickTabTitle(options.sheetName, availableTabs);
  if (!tabTitle) {
    throw new Error(
      `Sekme "${options.sheetName}" bulunamadı. Dosyadaki sekmeler: ${availableTabs.join(", ")}. ` +
        `Kullanıcı Yönetimi → Sekme Adı alanına doğru adı yazın (Türkçe dosyalarda genelde "Sayfa1").`,
    );
  }

  return {
    range: formatSheetA1Range(tabTitle),
    tabTitle,
    availableTabs,
  };
}
