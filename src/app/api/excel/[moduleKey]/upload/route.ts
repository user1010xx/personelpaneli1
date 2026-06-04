import { NextResponse } from "next/server";
import type { ModuleKey } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { importExcelRows } from "@/lib/excel";
import { EXCEL_MODULES } from "@/lib/modules";
import { requireApiUserFromDb, parseDate } from "@/lib/api-helpers";
import { withModuleLock } from "@/lib/sync-lock";
import { logActivity, moduleTitle } from "@/lib/activity-log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleKey: string }> },
) {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const { moduleKey: rawKey } = await params;
  const moduleKey = rawKey.toUpperCase() as ModuleKey;

  if (!EXCEL_MODULES.includes(moduleKey)) {
    return NextResponse.json({ error: "Geçersiz Excel modülü" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const fromRaw = formData.get("from");
  const toRaw = formData.get("to");
  const periodFrom = parseDate(typeof fromRaw === "string" ? fromRaw : null);
  const periodTo = parseDate(typeof toRaw === "string" ? toRaw : null);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }
  if (!periodFrom || !periodTo) {
    return NextResponse.json({ error: "Başlangıç ve bitiş tarihi gerekli" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await withModuleLock(moduleKey, () =>
      importExcelRows({
        moduleKey,
        buffer,
        fileName: file.name,
        uploadedById: auth.user!.id,
        periodFrom,
        periodTo,
      }),
    );
    const periodLabel =
      periodFrom.getTime() === periodTo.getTime()
        ? format(periodFrom, "d MMMM yyyy", { locale: tr })
        : `${format(periodFrom, "d MMMM yyyy", { locale: tr })} – ${format(periodTo, "d MMMM yyyy", { locale: tr })}`;
    logActivity(
      auth.user!,
      "EXCEL_YUKLE",
      `${moduleTitle(moduleKey)} modülüne Excel yükledi (${periodLabel}): "${file.name}" (${result.rowCount} satır).`,
      {
        moduleKey,
        metadata: {
          fileName: file.name,
          rowCount: result.rowCount,
          periodFrom: periodFrom.toISOString(),
          periodTo: periodTo.toISOString(),
        },
      },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yükleme başarısız";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
