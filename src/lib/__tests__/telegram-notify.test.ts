import { describe, expect, it } from "vitest";
import { formatPanelActivityMessage } from "@/lib/telegram/notify";

describe("telegram activity format", () => {
  it("formats quality score add like the panel notice", () => {
    const text = formatPanelActivityMessage({
      userName: "Ahmet",
      at: new Date("2026-08-22T14:31:22.000Z"),
      action: "CAGRI_DENETLEME_EKLE",
      description: "Çağrı denetlemesi ekledi",
      metadata: {
        personelName: "Mehmet",
        phone: "905451112233",
        score: 100,
      },
    });

    expect(text).toContain("Kullanıcı : Ahmet");
    expect(text).toContain("Tarih saat : 22.08.2026 - 17:31:22");
    expect(text).toContain("İşlem : Mehmet çağrı denetlemesi sağlanıp puanlandı");
    expect(text).toContain("Not : Mehmet - 905451112233 - 100 Puan");
  });

  it("formats knowledge duel add with result", () => {
    const text = formatPanelActivityMessage({
      userName: "Ahmet",
      at: new Date("2026-08-23T06:41:49.000Z"),
      action: "BILGI_DUELLOSU_EKLE",
      description: "Bilgi duellosu ekledi",
      metadata: {
        personelName: "Mehmet",
        result: "DOGRU",
        recordDate: "2026-08-23",
      },
    });

    expect(text).toContain("İşlem : Mehmet bilgi duellosu kaydı eklendi");
    expect(text).toContain("Not : Mehmet - Doğru - 2026-08-23");
  });
});
