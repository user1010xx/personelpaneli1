import { describe, expect, it } from "vitest";
import { parseSheetTabPeriodDate } from "@/lib/sheet-parsers/whatsapp-period";

describe("parseSheetTabPeriodDate", () => {
  it("parses Turkish month and year from tab title", () => {
    const d = parseSheetTabPeriodDate("WHATSAPP ADEDİ - CEVAPSIZ ADEDİ - HAZİRAN 2026");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(1);
  });

  it("returns null when month not found", () => {
    expect(parseSheetTabPeriodDate("Sheet1")).toBeNull();
  });
});
