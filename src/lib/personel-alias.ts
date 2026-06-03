import type { AliasScope } from "@prisma/client";
import { prisma } from "@/lib/db";
import { displayPersonelName, normalizePersonelName } from "@/lib/utils";

export type PersonelAliasMap = Map<string, string>;

export function personelAliasKey(value: string) {
  return normalizePersonelName(value);
}

export type PersonelAliasScope = AliasScope | "GLOBAL";

export function personelAliasScopeKey(scope?: PersonelAliasScope | null) {
  return scope && scope !== "GLOBAL" ? scope : "GLOBAL";
}

export function resolvePersonelDisplayName(
  rawName: string | null | undefined,
  aliases: PersonelAliasMap,
) {
  if (!rawName?.trim()) return "";
  const displayName = displayPersonelName(rawName);
  return aliases.get(personelAliasKey(displayName)) ?? displayName;
}

export function resolvePersonelBucketKey(
  rawName: string | null | undefined,
  aliases: PersonelAliasMap,
) {
  const resolved = resolvePersonelDisplayName(rawName, aliases);
  return resolved ? personelAliasKey(resolved) : "";
}

export async function loadPersonelAliases(scope?: PersonelAliasScope | null): Promise<PersonelAliasMap> {
  const scopeKey = personelAliasScopeKey(scope);
  const rows = await prisma.personelAlias.findMany({
    where: scopeKey !== "GLOBAL" ? { OR: [{ scope: scopeKey }, { scope: null }] } : { scope: null },
    orderBy: [{ scopeKey: "asc" }, { aliasName: "asc" }],
    select: {
      aliasKey: true,
      canonicalName: true,
      scopeKey: true,
    },
  });

  const aliases = new Map<string, string>();
  for (const row of rows) {
    if (!aliases.has(row.aliasKey) || row.scopeKey === scopeKey) {
      aliases.set(row.aliasKey, displayPersonelName(row.canonicalName));
    }
  }
  return aliases;
}

export async function listPersonelNameOptions() {
  const [sheetRows, excelRows, qualityRows, trainingRows] = await Promise.all([
    prisma.sheetDataRow.findMany({
      where: { moduleKey: "PERSONEL", personelName: { not: null } },
      select: { personelName: true },
      distinct: ["personelName"],
      take: 2000,
    }),
    prisma.excelDataRow.findMany({
      where: { personelName: { not: null } },
      select: { personelName: true },
      distinct: ["personelName"],
      take: 2000,
    }),
    prisma.qualityScore.findMany({
      select: { personelName: true },
      distinct: ["personelName"],
      take: 2000,
    }),
    prisma.trainingFeedback.findMany({
      select: { personelName: true },
      distinct: ["personelName"],
      take: 2000,
    }),
  ]);

  return Array.from(
    new Set(
      [...sheetRows, ...excelRows, ...qualityRows, ...trainingRows]
        .map((row) => displayPersonelName(row.personelName ?? ""))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "tr"));
}