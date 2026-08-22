import { describe, expect, it } from "vitest";
import { buildExampleCallSummary } from "@/lib/example-call";

describe("example call summary", () => {
  it("accumulates adet by personel", () => {
    const summary = buildExampleCallSummary([
      { personelName: "Ahmet" },
      { personelName: "Ahmet" },
      { personelName: "Ahmet" },
      { personelName: "Mehmet" },
    ]);
    expect(summary.find((row) => row.personelName === "Ahmet")?.adet).toBe(3);
    expect(summary.find((row) => row.personelName === "Mehmet")?.adet).toBe(1);
  });
});
