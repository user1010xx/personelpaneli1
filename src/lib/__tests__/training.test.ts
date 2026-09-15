import { describe, expect, it } from "vitest";
import { buildTrainingSummary } from "@/lib/training";
import { uniquePersonnel } from "@/lib/personnel-batch";

describe("buildTrainingSummary", () => {
  it("aggregates by personel and record type", () => {
    const summary = buildTrainingSummary([
      { personelName: "Ali", recordType: "EGITIM" },
      { personelName: "Ali", recordType: "GERIBILDIRIM" },
      { personelName: "Veli", recordType: "EGITIM" },
    ]);
    const ali = summary.find((r) => r.personelName === "Ali");
    expect(ali?.egitimAdedi).toBe(1);
    expect(ali?.geribildirimAdedi).toBe(1);
    expect(summary).toHaveLength(2);
  });
});

describe("uniquePersonnel", () => {
  it("trims names and removes Turkish-case duplicates", () => {
    expect(
      uniquePersonnel({ personelNames: ["  İrem  Kaya ", "irem kaya", "Ali Veli"] }),
    ).toEqual(["irem kaya", "Ali Veli"]);
  });
});
