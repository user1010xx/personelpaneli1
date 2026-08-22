import { describe, expect, it } from "vitest";
import { buildDashboardResult, emptyDashboardTotals } from "@/lib/dashboard";
import { affectedPrefixesForModule } from "@/lib/panel-cache";

describe("dashboard helpers", () => {
  it("starts totals at zero", () => {
    expect(emptyDashboardTotals()).toEqual({
      dinlenenCagriAdedi: 0,
      ortalamaPuan: 0,
      insiyatifAdedi: 0,
      geribildirimAdedi: 0,
      egitimAdedi: 0,
      ornekCagriAdedi: 0,
      motivasyonAdedi: 0,
      personelAdedi: 0,
    });
  });

  it("counts call feedback as geribildirim and training EGITIM as egitim", () => {
    const from = new Date(2026, 7, 1);
    const to = new Date(2026, 7, 31, 23, 59, 59, 999);
    const result = buildDashboardResult(
      {
        quality: [{ personelName: "Ali Yılmaz", score: 80 }],
        initiative: [{ personelName: "Ali Yılmaz" }],
        training: [
          { personelName: "Ali Yılmaz", recordType: "EGITIM" },
          { personelName: "Ali Yılmaz", recordType: "GERIBILDIRIM" },
        ],
        callFeedback: [{ personelName: "Ali Yılmaz" }, { personelName: "ali yilmaz" }],
        exampleCalls: [
          { personelName: "Ali Yılmaz", recordType: "ORNEK_CAGRI" },
          { personelName: "Ali Yılmaz", recordType: "ORNEK_CAGRI" },
          { personelName: "ali yilmaz", recordType: "MOTIVASYON" },
        ],
      },
      { from, to },
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      dinlenenCagriAdedi: 1,
      ortalamaPuan: 80,
      insiyatifAdedi: 1,
      egitimAdedi: 1,
      geribildirimAdedi: 3,
      ornekCagriAdedi: 2,
      motivasyonAdedi: 1,
    });
    expect(result.totals.ornekCagriAdedi).toBe(2);
    expect(result.totals.motivasyonAdedi).toBe(1);
    expect(result.totals.geribildirimAdedi).toBe(3);
    expect(result.totals.egitimAdedi).toBe(1);
  });
});

describe("panel cache prefixes", () => {
  it("invalidates dashboard after training and call feedback writes", () => {
    expect(affectedPrefixesForModule("EGITIM")).toEqual(["/api/training", "/api/dashboard"]);
    expect(affectedPrefixesForModule("CALL_FEEDBACK")).toEqual([
      "/api/call-feedback",
      "/api/dashboard",
    ]);
  });
});
