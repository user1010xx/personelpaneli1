import ExcelJS from "exceljs";

export async function rowsToWorkbook(rows: Record<string, unknown>[], sheetName = "Veri") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Veri");
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  worksheet.columns = columns.map((key) => ({ header: key, key }));
  worksheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
