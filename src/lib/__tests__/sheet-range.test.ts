import { describe, expect, it } from "vitest";
import { formatSheetA1Range } from "@/lib/sheet-range";

describe("formatSheetA1Range", () => {
  it("quotes sheet names with spaces", () => {
    expect(formatSheetA1Range("PERSONEL LİSTESİ")).toBe("'PERSONEL LİSTESİ'!A:ZZZ");
  });

  it("does not quote simple names", () => {
    expect(formatSheetA1Range("Sayfa1")).toBe("Sayfa1!A:ZZZ");
  });
});
