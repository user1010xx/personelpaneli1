import { NextResponse } from "next/server";
import type { ModuleKey } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { deleteExcelUpload } from "@/lib/excel";
import { EXCEL_MODULES } from "@/lib/modules";
import { jsonResponse, requireApiUserFromDb } from "@/lib/api-helpers";
import { logActivity, moduleTitle } from "@/lib/activity-log";

function formatPeriod(from: Date | null, to: Date | null) {
  if (!from || !to) return "tarihsiz";
  if (from.getTime() === to.getTime()) {
    return format(from, "d MMMM yyyy", { locale: tr });
  }
  return `${format(from, "d MMMM yyyy", { locale: tr })} – ${format(to, "d MMMM yyyy", { locale: tr })}`;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ moduleKey: string; uploadId: string }> },
) {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const { moduleKey: rawKey, uploadId } = await params;
  const moduleKey = rawKey.toUpperCase() as ModuleKey;

  if (!EXCEL_MODULES.includes(moduleKey)) {
    return NextResponse.json({ error: "Geçersiz Excel modülü" }, { status: 400 });
  }

  try {
    const removed = await deleteExcelUpload(moduleKey, uploadId);
    const periodLabel = formatPeriod(removed.periodFrom, removed.periodTo);
    logActivity(
      auth.user!,
      "EXCEL_SIL",
      `${moduleTitle(moduleKey)} modülünden Excel yüklemesini sildi (${periodLabel}): "${removed.fileName}" (${removed.rowCount} satır).`,
      {
        moduleKey,
        metadata: {
          uploadId,
          fileName: removed.fileName,
          rowCount: removed.rowCount,
        },
      },
    );
    return jsonResponse({ ok: true, rowCount: removed.rowCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Silme başarısız";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
