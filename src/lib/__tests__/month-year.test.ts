import { describe, expect, it } from "vitest";
import {
  formatMonthYearLabel,
  monthYearToIsoRange,
  resolveMonthYear,
} from "@/lib/month-year";

describe("month-year", () => {
  it("converts month/year to full month ISO range", () => {
    expect(monthYearToIsoRange(3, 2025)).toEqual({
      from: "2025-03-01",
      to: "2025-03-31",
    });
  });

  it("formats Turkish month label", () => {
    expect(formatMonthYearLabel(3, 2025).toLowerCase()).toContain("mart");
  });

  it("resolves from legacy from date", () => {
    expect(resolveMonthYear({ from: "2024-11-15" })).toEqual({ month: 11, year: 2024 });
  });
});
