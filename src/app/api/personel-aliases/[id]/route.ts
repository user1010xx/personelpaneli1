import { NextResponse } from "next/server";
import { z } from "zod";
import type { AliasScope, ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiAdminFromDb } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";
import { personelAliasKey, personelAliasScopeKey } from "@/lib/personel-alias";
import { displayPersonelName } from "@/lib/utils";

const schema = z.object({
  aliasName: z.string().trim().min(1, "Alias isim gerekli").optional(),
  canonicalName: z.string().trim().min(1, "Gerçek personel adı gerekli").optional(),
  scope: z
    .enum(["PERSONEL", "PUANTAJ", "WHATSAPP", "UYARI_KESINTI", "UYE_ADEDI", "CAGRI_SURECI", "KALITE", "EGITIM"])
    .nullable()
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }

  const existing = await prisma.personelAlias.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Eşleştirme bulunamadı" }, { status: 404 });
  }

  const aliasName = body.data.aliasName ? displayPersonelName(body.data.aliasName) : existing.aliasName;
  const canonicalName = body.data.canonicalName
    ? displayPersonelName(body.data.canonicalName)
    : existing.canonicalName;
  const aliasKey = personelAliasKey(aliasName);
  const canonicalKey = personelAliasKey(canonicalName);
  const scope =
    "scope" in body.data
      ? ((body.data.scope ?? null) as AliasScope | null)
      : existing.scope;
  const moduleKey = scope && !["KALITE", "EGITIM"].includes(scope) ? (scope as ModuleKey) : null;

  if (aliasKey === canonicalKey) {
    return NextResponse.json({ error: "Alias ve gerçek personel aynı olamaz" }, { status: 400 });
  }

  try {
    const alias = await prisma.personelAlias.update({
      where: { id },
      data: {
        aliasName,
        aliasKey,
        canonicalName,
        canonicalKey,
        moduleKey,
        scope,
        scopeKey: personelAliasScopeKey(scope),
      },
      select: {
        id: true,
        aliasName: true,
        canonicalName: true,
        moduleKey: true,
        scope: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logActivity(
      auth.user!,
      "PERSONEL_ALIAS_GUNCELLE",
      `${aliasName} eşleştirmesini ${canonicalName} olarak güncelledi.`,
      { moduleKey: "PERSONEL_ALIAS", metadata: { aliasId: alias.id } },
    );

    return NextResponse.json({ alias });
  } catch {
    return NextResponse.json({ error: "Bu alias zaten kayıtlı" }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  const { id } = await params;
  const alias = await prisma.personelAlias.findUnique({ where: { id } });
  if (!alias) {
    return NextResponse.json({ error: "Eşleştirme bulunamadı" }, { status: 404 });
  }

  await prisma.personelAlias.delete({ where: { id } });
  logActivity(
    auth.user!,
    "PERSONEL_ALIAS_SIL",
    `${alias.aliasName} → ${alias.canonicalName} eşleştirmesini sildi.`,
    { moduleKey: "PERSONEL_ALIAS", metadata: { aliasId: id } },
  );

  return NextResponse.json({ ok: true });
}