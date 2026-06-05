import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUserFromDb } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

const updateSchema = z.object({
  type: z.enum(["TALEP", "ONERI"]).optional(),
  reporterName: z.string().trim().min(2).max(120).optional(),
  subject: z.string().trim().min(2).max(180).optional(),
  content: z.string().trim().min(3).max(4000).optional(),
});

async function canModify(id: string, userId: string, role: "ADMIN" | "USER") {
  const row = await prisma.suggestionRequest.findUnique({ where: { id } });
  if (!row) return { row: null, error: NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 }) };
  if (role !== "ADMIN" && row.createdById !== userId) {
    return { row: null, error: NextResponse.json({ error: "Bu kayıt için yetkiniz yok" }, { status: 403 }) };
  }
  return { row, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const { id } = await params;
  const permission = await canModify(id, auth.user!.id, auth.user!.role);
  if (permission.error) return permission.error;

  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz veri" },
      { status: 400 },
    );
  }

  const row = await prisma.suggestionRequest.update({
    where: { id },
    data: body.data,
  });

  logActivity(auth.user!, "ONERI_TALEP_GUNCELLE", `Öneri/Talep güncelledi: ${row.subject}`, {
    moduleKey: "SUGGESTION_REQUEST",
    metadata: { id },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const { id } = await params;
  const permission = await canModify(id, auth.user!.id, auth.user!.role);
  if (permission.error) return permission.error;

  await prisma.suggestionRequest.delete({ where: { id } });
  logActivity(auth.user!, "ONERI_TALEP_SIL", `Öneri/Talep sildi: ${permission.row!.subject}`, {
    moduleKey: "SUGGESTION_REQUEST",
    metadata: { id },
  });

  return NextResponse.json({ ok: true });
}