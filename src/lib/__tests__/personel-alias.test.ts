import { describe, expect, it } from "vitest";
import {
  personelAliasKey,
  resolvePersonelBucketKey,
  resolvePersonelDisplayName,
} from "@/lib/personel-alias";

describe("personel alias", () => {
  it("resolves alias names to canonical names", () => {
    const aliases = new Map([[personelAliasKey("Ahmett"), "Ahmet"]]);

    expect(resolvePersonelDisplayName(" Ahmett ", aliases)).toBe("Ahmet");
    expect(resolvePersonelBucketKey("Ahmett", aliases)).toBe(personelAliasKey("Ahmet"));
  });

  it("uses case-insensitive keys for the same personnel", () => {
    expect(personelAliasKey("AHMET")).toBe(personelAliasKey("Ahmet"));
    expect(personelAliasKey(" ahmet ")).toBe(personelAliasKey("Ahmet"));
    expect(personelAliasKey("Çağla Şahin")).toBe(personelAliasKey("Cagla Sahin"));
  });

  it("supports multiple aliases for one canonical person", () => {
    const aliases = new Map([
      [personelAliasKey("Ahmett"), "Ahmet"],
      [personelAliasKey("Ahmettt"), "Ahmet"],
    ]);

    expect(resolvePersonelBucketKey("Ahmett", aliases)).toBe(personelAliasKey("Ahmet"));
    expect(resolvePersonelBucketKey("Ahmettt", aliases)).toBe(personelAliasKey("Ahmet"));
  });
});