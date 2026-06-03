import { describe, expect, it } from "vitest";
import { computeSheetModuleStats } from "@/lib/sheet-stats";

describe("computeSheetModuleStats PERSONEL", () => {
  const anchor = new Date("2026-05-15T12:00:00");

  const rows = [
    {
      personelName: "ali",
      recordDate: new Date("2026-05-10"),
      createdAt: new Date("2026-05-01"),
      rowData: { "Personel Adı": "ali" },
    },
    {
      personelName: "veli",
      recordDate: new Date("2026-04-01"),
      createdAt: new Date("2026-04-01"),
      rowData: { "Personel Adı": "veli" },
    },
    {
      personelName: "ayşe",
      recordDate: new Date("2026-05-19"),
      createdAt: new Date("2026-05-19"),
      rowData: { "Personel Adı": "ayşe" },
    },
  ];

  it("filters period by işe giriş tarihi and exposes total list size", () => {
    const daily = computeSheetModuleStats("PERSONEL", rows, "daily", anchor);
    const weekly = computeSheetModuleStats("PERSONEL", rows, "weekly", anchor);
    const monthly = computeSheetModuleStats("PERSONEL", rows, "monthly", anchor);

    expect(daily.totalPersonelCount).toBe(3);
    expect(monthly.totalPersonelCount).toBe(3);
    expect(monthly.recordCount).toBe(2);
    expect(weekly.recordCount).toBe(0);
    expect(daily.recordCount).toBe(0);
  });
});
