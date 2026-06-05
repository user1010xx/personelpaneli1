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
      ["Ali", "BULUT EKİBİ", "", "", "", "", "", "15", "3"],
      ["Mehmet", "DİĞER", "", "", "", "", "", "20", "4"],
      ["Fatma", "bulut", "", "", "", "", "", "30", "6"],
    ]);

    const result = await parseWorkbookBuffer(buffer, "uye.xlsx", "UYE_ADEDI");

    expect(result.rows).toEqual([
      { "Personel Adı": "Ayşe", "Üye Adedi": "10", "İlk Yat Adedi": "2" },
      { "Personel Adı": "Ali", "Üye Adedi": "15", "İlk Yat Adedi": "3" },
      { "Personel Adı": "Fatma", "Üye Adedi": "30", "İlk Yat Adedi": "6" },
    ]);
  });

  it("skips CAGRI_SURECI header rows even when report has a title row", async () => {
    const buffer = await workbookBuffer([
      ["Çağrı Raporu", "", "", ""],
      ["DAHİLİ ADI", "TOPLAM ARAMA ADEDİ", "KONUŞMA SÜRESİ", "ARAMA SAYISI (OUT)"],
      ["sadık", "1711", "02:31:01", "1711"],
    ]);

    const result = await parseWorkbookBuffer(buffer, "cagri.xlsx", "CAGRI_SURECI");

    expect(result.rows).toEqual([
      { "Personel Adı": "sadık", "Arama Adedi": "1711", "Konuşma Süresi": "02:31:01" },
    ]);
  });
});