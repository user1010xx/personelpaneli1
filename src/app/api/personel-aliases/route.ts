import { NextResponse } from "next/server";
import { z } from "zod";
import type { AliasScope, ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiAdminFromDb } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";
import {
  listPersonelNameOptions,
  personelAliasKey,
  personelAliasScopeKey,
} from "@/lib/personel-alias";
import { displayPersonelName } from "@/lib/utils";

const schema = z.object({
  aliasName: z.string().trim().optional(),
  aliasNames: z.array(z.string().trim()).optional(),
  canonicalName: z.string().trim().min(1, "Gerçek personel adı gerekli"),
  scope: z
    .enum(["PERSONEL", "PUANTAJ", "WHATSAPP", "UYARI_KESINTI", "UYE_ADEDI", "CAGRI_SURECI", "KALITE", "EGITIM"])
    .nullable()
    .optional(),
});

function parseAliasNames(body: z.infer<typeof schema>) {
  return Array.from(
    new Set(
      [
        ...(body.aliasNames ?? []),
        ...(body.aliasName
          ? body.aliasName
              .split(/\r?\n|,/)
              .map((name) => name.trim())
          : []),
      ]
        .map(displayPersonelName)
        .filter(Boolean),
    ),
  );
}

export async function GET() {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  const [aliases, nameOptions] = await Promise.all([
    prisma.personelAlias.findMany({
      orderBy: [{ canonicalName: "asc" }, { aliasName: "asc" }],
      select: {
        id: true,
        aliasName: true,
        canonicalName: true,
        moduleKey: true,
        scope: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    listPersonelNameOptions(),
  ]);

  return NextResponse.json({ aliases, nameOptions });
}

export async function POST(request: Request) {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }

  const aliasNames = parseAliasNames(body.data);
  const canonicalName = displayPersonelName(body.data.canonicalName);
  const canonicalKey = personelAliasKey(canonicalName);
  const scope = (body.data.scope ?? null) as AliasScope | null;
  const moduleKey = scope && !["KALITE", "EGITIM"].includes(scope) ? (scope as ModuleKey) : null;
  const scopeKey = personelAliasScopeKey(scope);
  const validAliases = aliasNames.filter((aliasName) => personelAliasKey(aliasName) !== canonicalKey);

  if (validAliases.length === 0) {
    return NextResponse.json(
      { error: "En az bir farklı dosya ismi girin. Büyük/küçük harf farkları otomatik aynı kişi sayılır." },
      { status: 400 },
    );
  }

  try {
    const aliasKeys = validAliases.map(personelAliasKey);
    const existingAliases = await prisma.personelAlias.findMany({
      where: {
        aliasKey: { in: aliasKeys },
        scopeKey,
      },
      select: {
        aliasName: true,
        canonicalName: true,
      },
    });

    if (existingAliases.length > 0) {
      const detail = existingAliases
        .map((alias) => `${alias.aliasName} → ${alias.canonicalName}`)
        .join(", ");
      return NextResponse.json(
        { error: `Bu dosya ismi zaten eşleştirilmiş: ${detail}` },
        { status: 409 },
      );
    }

    const aliases = await prisma.$transaction(
      validAliases.map((aliasName) =>
        prisma.personelAlias.create({
          data: {
            aliasName,
            aliasKey: personelAliasKey(aliasName),
            canonicalName,
            canonicalKey,
            moduleKey,
            scope,
            scopeKey,
            createdById: auth.user!.id,
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
        }),
      ),
    );

    const aliasesForResponse = aliases.map((alias) => ({
      id: alias.id,
      aliasName: alias.aliasName,
      canonicalName: alias.canonicalName,
      moduleKey: alias.moduleKey,
      scope: alias.scope,
      createdAt: alias.createdAt,
      updatedAt: alias.updatedAt,
    }));

    logActivity(
      auth.user!,
      "PERSONEL_ALIAS_EKLE",
      `${validAliases.join(", ")} isimlerini ${canonicalName} personeline eşleştirdi.`,
      { moduleKey: "PERSONEL_ALIAS", metadata: { aliasIds: aliases.map((alias) => alias.id) } },
    );

    return NextResponse.json({ aliases: aliasesForResponse, createdCount: aliases.length }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Bu dosya ismi zaten eşleştirilmiş" }, { status: 409 });
    }
    return NextResponse.json({ error: "Eşleştirme kaydedilemedi" }, { status: 500 });
  }
}