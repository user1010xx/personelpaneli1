import { describe, expect, it } from "vitest";
import { resolveTelegramReportCommand } from "@/lib/telegram/bot";

describe("telegram report commands", () => {
  it("maps /ornek to example call reports", () => {
    expect(resolveTelegramReportCommand("ornek")).toBe("ornekcagri");
    expect(resolveTelegramReportCommand("ornekcagri")).toBe("ornekcagri");
  });

  it("maps /bilgiduellosu to knowledge duel reports", () => {
    expect(resolveTelegramReportCommand("bilgiduellosu")).toBe("bilgiduellosu");
    expect(resolveTelegramReportCommand("bilgi-duellosu")).toBe("bilgiduellosu");
  });
});
