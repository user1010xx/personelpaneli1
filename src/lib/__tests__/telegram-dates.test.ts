import { describe, expect, it } from "vitest";
import { parseTelegramDateRange, parseTelegramDay } from "@/lib/telegram/dates";

describe("telegram dates", () => {
  it("parses a single TR date as that day", () => {
    const range = parseTelegramDateRange("22.08.2026");
    expect(range).not.toBeNull();
    expect(range!.from.getFullYear()).toBe(2026);
    expect(range!.from.getMonth()).toBe(7);
    expect(range!.from.getDate()).toBe(22);
    expect(range!.to.getDate()).toBe(22);
    expect(range!.to.getHours()).toBe(23);
  });

  it("parses a date range with dash", () => {
    const range = parseTelegramDateRange("01.08.2026 - 22.08.2026");
    expect(range!.from.getDate()).toBe(1);
    expect(range!.to.getDate()).toBe(22);
  });

  it("parses ISO dates", () => {
    expect(parseTelegramDay("2026-08-22")?.getDate()).toBe(22);
  });

  it("rejects invalid dates", () => {
    expect(parseTelegramDateRange("32.13.2026")).toBeNull();
    expect(parseTelegramDateRange("bugun")).toBeNull();
  });
});
