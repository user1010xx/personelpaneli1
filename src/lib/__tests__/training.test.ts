import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildTrainingSummary } from "@/lib/training";
import {
  buildCanonicalPersonnelMap,
  optionalPersonelNameSchema,
  personelNamesSchema,
  requirePersonnel,
  uniquePersonnel,
} from "@/lib/personnel-batch";

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

  it("shows the most-used spelling for equivalent personnel names", () => {
    const summary = buildTrainingSummary([
      { personelName: "Güneş", recordType: "EGITIM" },
      { personelName: "Güneş", recordType: "EGITIM" },
      { personelName: "Gunes", recordType: "GERIBILDIRIM" },
    ]);

    expect(summary).toEqual([
      { personelName: "Güneş", egitimAdedi: 2, geribildirimAdedi: 1 },
    ]);
  });
});

describe("uniquePersonnel", () => {
  it("trims names and removes Turkish-case duplicates", () => {
    expect(
      uniquePersonnel({ personelNames: ["  İrem  Kaya: ", "irem kaya", "Ali Veli"] }),
    ).toEqual(["irem kaya", "Ali Veli"]);
  });
});

describe("personnel validation", () => {
  const schema = z
    .object({
      personelName: optionalPersonelNameSchema,
      personelNames: personelNamesSchema,
    })
    .superRefine(requirePersonnel);

  it("accepts one personnel from the batch field when the legacy field is blank", () => {
    expect(schema.parse({ personelName: "", personelNames: ["ENDER"] })).toEqual({
      personelName: undefined,
      personelNames: ["ENDER"],
    });
  });

  it("still rejects a one-character personnel name", () => {
    expect(() => schema.parse({ personelName: "", personelNames: ["E"] })).toThrow(
      "Personel adı en az 2 karakter olmalı",
    );
  });
});

describe("buildCanonicalPersonnelMap", () => {
  it("matches Turkish character variants to the most-used spelling", () => {
    const canonical = buildCanonicalPersonnelMap([
      { personelName: "Güneş", count: 2 },
      { personelName: "Güneş", count: 2 },
      { personelName: "Gunes", count: 3 },
      { personelName: "Emirhan", count: 3 },
    ]);

    expect(canonical.get("gunes")).toBe("Güneş");
    expect(canonical.get("emirhan")).toBe("Emirhan");
  });
});
