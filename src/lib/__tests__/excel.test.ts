import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseWorkbookBuffer } from "@/lib/excel";

async function workbookBuffer(rows: string[][]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Veri");
  worksheet.addRows(rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("parseWorkbookBuffer", () => {
  it("filters UYE_ADEDI rows by manager column", async () => {
    const buffer = await workbookBuffer([
      ["Personel", "Yönetici", "", "", "", "", "", "Üye", "İlk Yat"],
      ["Ayşe", "BULUT", "", "", "", "", "", "10", "2"],
      ["Mehmet", "DİĞER", "", "", "", "", "", "20", "4"],
      ["Fatma", "bulut", "", "", "", "", "", "30", "6"],
    ]);

    const result = await parseWorkbookBuffer(buffer, "uye.xlsx", "UYE_ADEDI");

    expect(result.rows).toEqual([
      { "Personel Adı": "Ayşe", "Üye Adedi": "10", "İlk Yat Adedi": "2" },
      { "Personel Adı": "Fatma", "Üye Adedi": "30", "İlk Yat Adedi": "6" },
    ]);
  });
});