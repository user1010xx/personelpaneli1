import { NextResponse } from "next/server";
import { z } from "zod";
import type { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SHEET_MODULES } from "@/lib/modules";
import { requireApiAdmin } from "@/lib/api-helpers";
import { logActivity, moduleTitle } from "@/lib/activity-log";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const configs = await prisma.sheetConfig.findMany({
    where: { moduleKey: { in: SHEET_MODULES } },
  });

  return NextResponse.json({ configs });
}

const upsertSchema = z.object({
  moduleKey: z.enum(["PERSONEL", "PUANTAJ", "WHATSAPP", "UYARI_KESINTI"]),
  spreadsheetId: z.string().min(5),
  sheetName: z.string().optional(),
  range: z.string().optional(),
  headerRow: z.number().int().min(1).optional(),
});

export async function PUT(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const body = upsertSchema.parse(await request.json());
    const config = await prisma.sheetConfig.upsert({
      where: { moduleKey: body.moduleKey as ModuleKey },
      create: {
        moduleKey: body.moduleKey as ModuleKey,
        spreadsheetId: body.spreadsheetId.trim(),
        sheetName: body.sheetName?.trim() || "Sayfa1",
        range: body.range?.trim() || null,
        headerRow: body.headerRow ?? 1,
      },
      update: {
        spreadsheetId: body.spreadsheetId.trim(),
        sheetName: body.sheetName?.trim() || "Sayfa1",
        range: body.range?.trim() || null,
        headerRow: body.headerRow ?? 1,
      },
    });

    logActivity(
      auth.user!,
      "SHEETS_BAGLANTI",
      `${moduleTitle(body.moduleKey)} modülü için Google Sheets bağlantı ayarlarını kaydetti (sekme: ${config.sheetName}).`,
      { moduleKey: body.moduleKey },
    );

    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "Kayıt başarısız" }, { status: 400 });
  }
}
