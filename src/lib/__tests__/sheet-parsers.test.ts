import { describe, expect, it } from "vitest";
import { endOfDay } from "date-fns";
import {
  aggregatePuantajByPersonel,
  classifyUyariKesinti,
  displayColumnsForModule,
  parsePersonelSheet,
  parsePuantajCell,
  parsePuantajSheet,
  parseUyariKesintiSheet,
  parseWhatsappSheet,
} from "@/lib/sheet-parsers";

describe("parsePersonelSheet", () => {
  it("normalizes columns and order for display", () => {
    const headers = [
      "PERSONEL ADI",
      "KULLANICI ADI",
      "İŞE GİRİŞ TARİHİ",
      "MAİL",
      "REFERANSI",
      "TEFİ TARİHİ",
    ];
    const parsed = parsePersonelSheet(headers, [
      ["ahmet", "@ahmet111", "01.01.2024", "ahmet@info.com", "@ayse22", "15.06.2025"],
    ]);
    expect(parsed[0].personelName).toBe("ahmet");
    expect(Object.keys(parsed[0].rowData)).toEqual([
      "Personel Adı",
      "Kullanıcı adı",
      "İşe giriş Tarihi",
      "Mail",
      "Referans",
      "Terfi Tarihi",
    ]);
    expect(
      displayColumnsForModule(
        "PERSONEL",
        parsed.map((r) => ({ data: r.rowData })),
      ),
    ).toEqual([
      "Personel Adı",
      "Kullanıcı adı",
      "İşe giriş Tarihi",
      "Mail",
      "Referans",
      "Terfi Tarihi",
    ]);
  });
});

describe("parsePuantajCell", () => {
  it("maps attendance codes to mesai and izin days", () => {
    expect(parsePuantajCell("VAR")).toEqual({ status: "VAR", mesaiGun: 1, izinGun: 0 });
    expect(parsePuantajCell("YOK")).toEqual({ status: "YOK", mesaiGun: 0, izinGun: 1 });
    expect(parsePuantajCell("HAFTALIK İZİN")).toEqual({
      status: "HAFTALIK_IZIN",
      mesaiGun: 1,
      izinGun: 0,
    });
    expect(parsePuantajCell("YARIM")).toEqual({ status: "YARIM", mesaiGun: 0.5, izinGun: 0.5 });
  });

  it("aggregates example month totals", () => {
    const headers = ["PERSONEL ADI", "01.06.2026", "02.06.2026", "03.06.2026", "04.06.2026", "05.06.2026"];
    const rows = [
      ["ALİ", "VAR", "HAFTALIK İZİN", "YARIM", "YOK", "VAR"],
    ];
    const parsed = parsePuantajSheet(headers, rows);
    const mesai = parsed.reduce(
      (s: number, r) => s + Number(r.rowData["Mesai (gün)"]),
      0,
    );
    const izin = parsed.reduce(
      (s: number, r) => s + Number(r.rowData["İzin / devamsızlık (gün)"]),
      0,
    );
    expect(mesai).toBe(3.5);
    expect(izin).toBe(1.5);
  });

  it("aggregates period totals (16 var, 3 haftalık, 1 yarım, 2 yok)", () => {
    const statuses = [
      ...Array(16).fill("VAR"),
      ...Array(3).fill("HAFTALIK İZİN"),
      ...Array(1).fill("YARIM"),
      ...Array(2).fill("YOK"),
    ];
    const rows = statuses.map((status, index) => {
      const gun = parsePuantajCell(status);
      return {
        personelName: "ALİ",
        recordDate: new Date(2026, 4, index + 1),
        rowData: {
          Durum: gun.status,
          "Mesai (gün)": String(gun.mesaiGun),
          "İzin / devamsızlık (gün)": String(gun.izinGun),
        },
      };
    });
    const from = new Date(2026, 4, 1);
    const to = endOfDay(new Date(2026, 4, 22));
    const [agg] = aggregatePuantajByPersonel(rows, from, to);
    expect(agg.mesaiGun).toBe(19.5);
    expect(agg.izinGun).toBe(2.5);
    expect(agg.kayitliGun).toBe(22);
  });
});

describe("classifyUyariKesinti", () => {
  it("empty kesinti is uyari", () => {
    expect(classifyUyariKesinti("")).toBe("UYARI");
    expect(classifyUyariKesinti("   ")).toBe("UYARI");
  });

  it("day count is kesinti", () => {
    expect(classifyUyariKesinti("1 GÜN")).toBe("KESINTI");
    expect(classifyUyariKesinti("4 gün")).toBe("KESINTI");
  });

  it("non-day text stays uyari", () => {
    expect(classifyUyariKesinti("açıklama")).toBe("UYARI");
  });
});

describe("parseUyariKesintiSheet", () => {
  it("adds kayit turu field", () => {
    const headers = ["PERSONEL ADI", "KESİNTİ", "KONU", "TARİH"];
    const parsed = parseUyariKesintiSheet(headers, [
      ["AHMET", "", "DUYURU", "01.05.2026"],
      ["ALİ", "1 GÜN", "SON GÖRÜLME", "10.12.2026"],
    ]);
    expect(parsed[0].rowData["Kayıt Türü"]).toBe("Uyarı");
    expect(parsed[1].rowData["Kayıt Türü"]).toBe("Kesinti");
  });
});

describe("parseWhatsappSheet", () => {
  it("keeps only summary columns", () => {
    const headers = [
      "PERSONEL ADI",
      "TOTAL WHATSAPP ADEDİ",
      "ORTALAMA WHATSAPP CEVAPSIZ",
      "TOTAL WHATSAPP CEVAPSIZ",
      "01.06.2026",
    ];
    const parsed = parseWhatsappSheet(headers, [["ali", "10", "2.5", "15", "1"]]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].personelName).toBe("ali");
    expect(Object.keys(parsed[0].rowData)).toEqual([
      "Ortalama WhatsApp Cevapsız",
      "Total WhatsApp Cevapsız",
    ]);
  });

  it("sets recordDate from sheet tab month (Haziran 2026)", () => {
    const headers = ["PERSONEL ADI", "ORTALAMA WHATSAPP CEVAPSIZ", "TOTAL WHATSAPP CEVAPSIZ"];
    const parsed = parseWhatsappSheet(
      headers,
      [["Ali", "57,60", "288"]],
      { sheetTab: "WHATSAPP ADEDİ - CEVAPSIZ ADEDİ - HAZİRAN 2026" },
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].recordDate?.getMonth()).toBe(5);
    expect(parsed[0].recordDate?.getFullYear()).toBe(2026);
    expect(parsed[0].rowData["Dönem"]).toContain("HAZİRAN");
  });
});
