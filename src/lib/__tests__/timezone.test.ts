import { describe, expect, it } from "vitest";
import { formatAppDateTime } from "@/lib/timezone";

describe("app timezone", () => {
  it("formats UTC instants in Europe/Istanbul", () => {
    expect(formatAppDateTime(new Date("2026-08-23T06:41:49.000Z"))).toBe(
      "23.08.2026 - 09:41:49",
    );
  });
});
