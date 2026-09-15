import { z } from "zod";
import { prisma } from "@/lib/db";
import { displayPersonelName, normalizePersonelName } from "@/lib/utils";

export const personelNameSchema = z
  .string()
  .trim()
  .min(2, "Personel adı en az 2 karakter olmalı");

export const personelNamesSchema = z.array(personelNameSchema).min(1).max(50).optional();

export function requirePersonnel(
  data: { personelName?: string; personelNames?: string[] },
  ctx: z.RefinementCtx,
) {
  if (!data.personelName && !data.personelNames?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "En az bir personel adı gerekli",
      path: ["personelNames"],
    });
  }
}

export function uniquePersonnel(data: { personelName?: string; personelNames?: string[] }) {
  const names = data.personelNames?.length ? data.personelNames : [data.personelName!];
  return Array.from(
    new Map(
      names.map((name) => [normalizePersonelName(name), displayPersonelName(name)]),
    ).values(),
  );
}

type PersonnelNameCount = { personelName: string; count: number };

export function buildCanonicalPersonnelMap(rows: PersonnelNameCount[]) {
  const candidates = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const personelName = displayPersonelName(row.personelName);
    const key = normalizePersonelName(personelName);
    const variants = candidates.get(key) ?? new Map<string, number>();
    variants.set(personelName, (variants.get(personelName) ?? 0) + row.count);
    candidates.set(key, variants);
  }
  return new Map(
    [...candidates].map(([key, variants]) => {
      const personelName = [...variants].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key;
      return [key, personelName];
    }),
  );
}

export async function resolveCanonicalPersonnelNames(names: string[]) {
  const grouped = await Promise.all([
    prisma.qualityScore.groupBy({ by: ["personelName"], _count: { _all: true } }),
    prisma.trainingFeedback.groupBy({ by: ["personelName"], _count: { _all: true } }),
    prisma.callFeedback.groupBy({ by: ["personelName"], _count: { _all: true } }),
    prisma.exampleCall.groupBy({ by: ["personelName"], _count: { _all: true } }),
    prisma.initiativeWork.groupBy({ by: ["personelName"], _count: { _all: true } }),
    prisma.knowledgeDuel.groupBy({ by: ["personelName"], _count: { _all: true } }),
  ]);
  const canonical = buildCanonicalPersonnelMap(
    grouped.flatMap((rows) =>
      rows.map((row) => ({ personelName: row.personelName, count: row._count._all })),
    ),
  );
  return names.map(
    (name) => canonical.get(normalizePersonelName(name)) ?? displayPersonelName(name),
  );
}