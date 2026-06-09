import { describe, expect, it } from "vitest";
import { avgByCount, pickIlkYatMetric, pickWhatsappAverageMetric } from "@/lib/dashboard";

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
});