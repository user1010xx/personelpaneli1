import { NextResponse } from "next/server";
import type { ModuleKey } from "@prisma/client";
import { listExcelUploads } from "@/lib/excel";
import { EXCEL_MODULES } from "@/lib/modules";
import { jsonResponse, requireApiUser } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moduleKey: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { moduleKey: rawKey } = await params;
  const moduleKey = rawKey.toUpperCase() as ModuleKey;

  if (!EXCEL_MODULES.includes(moduleKey)) {
    return NextResponse.json({ error: "Geçersiz Excel modülü" }, { status: 400 });
  }

  const uploads = await listExcelUploads(moduleKey);
  return jsonResponse({ uploads });
}
