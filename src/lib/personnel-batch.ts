import { z } from "zod";
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