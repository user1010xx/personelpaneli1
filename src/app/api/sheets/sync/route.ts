import { NextResponse } from "next/server";
import { z } from "zod";
import type { ModuleKey } from "@prisma/client";
import { syncSheetModule } from "@/lib/google-sheets";
import { requireApiUser } from "@/lib/api-helpers";
import { withModuleLock } from "@/lib/sync-lock";
import { logActivity, moduleTitle } from "@/lib/activity-log";

const schema = z.object({
  moduleKey: z.enum(["PERSONEL", "PUANTAJ", "WHATSAPP", "UYARI_KESINTI"]),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = schema.parse(await request.json());
    const result = await withModuleLock(body.moduleKey, () =>
      syncSheetModule(body.moduleKey as ModuleKey),
    );
    const title = moduleTitle(body.moduleKey);
    const tab = result.sheetTab ? ` Sekme: ${result.sheetTab}.` : "";
    logActivity(
      auth.user!,
      "SHEETS_GUNCELLE",
      `${title} modülü için Google Sheets verisini güncelledi (${result.rowCount} satır).${tab}`,
      { moduleKey: body.moduleKey, metadata: { rowCount: result.rowCount, sheetTab: result.sheetTab } },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Senkronizasyon başarısız";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
