import { describe, expect, it } from "vitest";
import { buildInitiativeWorkSummary, formatWorkDuration, parseWorkDuration } from "@/lib/initiative-work";

describe("initiative work helpers", () => {
  it("aggregates work count by personel", () => {
    const summary = buildInitiativeWorkSummary([
      { personelName: "Ali" },
      { personelName: "Ali" },
      { personelName: "Veli" },
    ]);

    expect(summary.find((row) => row.personelName === "Ali")?.calismaAdedi).toBe(2);
    expect(summary.find((row) => row.personelName === "Veli")?.calismaAdedi).toBe(1);
  });

  it("parses and formats talk duration", () => {
    expect(parseWorkDuration("01:02:03")).toBe(3723);
    expect(parseWorkDuration("12:30")).toBe(750);
    expect(formatWorkDuration(3723)).toBe("01:02:03");
  });
});