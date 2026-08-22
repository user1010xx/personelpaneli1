import { describe, expect, it } from "vitest";
import { buildExampleCallSummary } from "@/lib/example-call";

describe("example call summary", () => {
  it("accumulates adet by personel", () => {
    const summary = buildExampleCallSummary([
      { personelName: "Ahmet", recordType: "ORNEK_CAGRI" },
      { personelName: "Ahmet", recordType: "ORNEK_CAGRI" },
      { personelName: "Ahmet", recordType: "MOTIVASYON" },
      { personelName: "Mehmet", recordType: "MOTIVASYON" },
    ]);
    const ahmet = summary.find((row) => row.personelName === "Ahmet");
    expect(ahmet?.ornekCagriAdedi).toBe(2);
    expect(ahmet?.motivasyonAdedi).toBe(1);
    expect(summary.find((row) => row.personelName === "Mehmet")?.motivasyonAdedi).toBe(1);
  });
});
