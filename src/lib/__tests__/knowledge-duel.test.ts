import { describe, expect, it } from "vitest";
import {
  buildKnowledgeDuelSummary,
  knowledgeDuelPersonelKey,
  knowledgeDuelRecordDate,
} from "@/lib/knowledge-duel";

describe("knowledge duel summary", () => {
  it("accumulates dogru and yanlis by personel", () => {
    const summary = buildKnowledgeDuelSummary([
      { personelName: "Ahmet", result: "DOGRU" },
      { personelName: "ahmet", result: "DOGRU" },
      { personelName: "Ahmet", result: "YANLIS" },
      { personelName: "Mehmet", result: "YANLIS" },
    ]);
    const ahmet = summary.find((row) => row.personelName.toLocaleLowerCase("tr-TR") === "ahmet");
    expect(ahmet?.dogruAdedi).toBe(2);
    expect(ahmet?.yanlisAdedi).toBe(1);
    expect(ahmet?.toplam).toBe(3);
    expect(summary.find((row) => row.personelName === "Mehmet")?.yanlisAdedi).toBe(1);
  });

  it("normalizes the same personel name for the daily unique key", () => {
    expect(knowledgeDuelPersonelKey("Ali Yılmaz")).toBe(knowledgeDuelPersonelKey(" ali  yilmaz "));
    const day = knowledgeDuelRecordDate(new Date(2026, 7, 23, 14, 30));
    expect(day.getHours()).toBe(0);
    expect(day.getDate()).toBe(23);
  });
});
