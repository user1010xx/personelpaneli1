import { describe, expect, it } from "vitest";
import {
  dateRangeButtonLabel,
  resolveDateRange,
  resolveDateRangeFromFilters,
} from "@/lib/date-range-filter";

describe("date range presets", () => {
  const now = new Date(2026, 7, 23);

  it("resolves today, yesterday, this week and last 7 days", () => {
    expect(resolveDateRange("today", undefined, undefined, now)).toEqual({
      preset: "today",
      from: "2026-08-23",
      to: "2026-08-23",
    });
    expect(resolveDateRange("yesterday", undefined, undefined, now)).toEqual({
      preset: "yesterday",
      from: "2026-08-22",
      to: "2026-08-22",
    });
    expect(resolveDateRange("this_week", undefined, undefined, now)).toEqual({
      preset: "this_week",
      from: "2026-08-17",
      to: "2026-08-23",
    });
    expect(resolveDateRange("last_7_days", undefined, undefined, now)).toEqual({
      preset: "last_7_days",
      from: "2026-08-17",
      to: "2026-08-23",
    });
  });

  it("resolves this month and last 3 months as calendar months", () => {
    expect(resolveDateRange("this_month", undefined, undefined, now)).toEqual({
      preset: "this_month",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(resolveDateRange("last_3_months", undefined, undefined, now)).toEqual({
      preset: "last_3_months",
      from: "2026-06-01",
      to: "2026-08-31",
    });
  });

  it("normalizes custom range order", () => {
    expect(resolveDateRange("custom", "2026-08-25", "2026-08-20", now)).toEqual({
      preset: "custom",
      from: "2026-08-20",
      to: "2026-08-25",
    });
  });

  it("defaults missing preset to today unless custom dates exist", () => {
    expect(resolveDateRangeFromFilters({})).toMatchObject({ preset: "today" });
    expect(resolveDateRangeFromFilters({ customFrom: "2026-08-01", customTo: "2026-08-10" })).toMatchObject({
      preset: "custom",
      from: "2026-08-01",
      to: "2026-08-10",
    });
  });

  it("shows preset name on the trigger, dates for custom", () => {
    expect(dateRangeButtonLabel({ preset: "today", from: "2026-08-23", to: "2026-08-23" })).toBe(
      "Bugün",
    );
    expect(
      dateRangeButtonLabel({ preset: "custom", from: "2026-08-01", to: "2026-08-23" }),
    ).toBe("01.08.2026 - 23.08.2026");
  });
});
