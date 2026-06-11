import { describe, expect, it } from "vitest";
import {
  avgByCount,
  dashboardWeekKey,
  pickIlkYatMetric,
  pickWhatsappAverageMetric,
} from "@/lib/dashboard";

describe("dashboard metrics", () => {
  it("uses explicit WhatsApp average instead of total", () => {
    expect(
      pickWhatsappAverageMetric({
        "Ortalama WhatsApp Cevapsız": "31.3",
        "Total WhatsApp Cevapsız": "125",
      }),
    ).toBe(31.3);
  });

  it("averages call totals by loaded period count", () => {
    expect(avgByCount([100, 200, 300], 3)).toBe(200);
  });

  it("reads first deposit count separately from member count", () => {
    expect(
      pickIlkYatMetric({
        "Üye Adedi": "56",
        "İlk Yat Adedi": "3",
      }),
    ).toBe(3);
  });

  it("groups dashboard leader dates by fixed monthly week buckets", () => {
    expect(dashboardWeekKey(new Date(2026, 5, 1))).toBe("2026-06-01");
    expect(dashboardWeekKey(new Date(2026, 5, 8))).toBe("2026-06-08");
    expect(dashboardWeekKey(new Date(2026, 5, 15))).toBe("2026-06-15");
    expect(dashboardWeekKey(new Date(2026, 5, 22))).toBe("2026-06-22");
    expect(dashboardWeekKey(new Date(2026, 5, 30))).toBe("2026-06-22");
  });
});