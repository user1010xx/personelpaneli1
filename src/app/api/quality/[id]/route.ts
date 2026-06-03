import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { canModifyRecord } from "@/lib/record-auth";
import { logActivity } from "@/lib/activity-log";

const updateSchema = z.object({
  personelName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  score: z.number().min(0).max(100).optional(),
  note: z.string().optional(),
  recordDate: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.qualityScore.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }
    if (!canModifyRecord(auth.user!, existing.createdById)) {
      return NextResponse.json({ error: "Bu kaydı düzenleme yetkiniz yok" }, { status: 403 });
    }

    const body = updateSchema.parse(await request.json());
    if (body.recordDate) {
      const recordDate = parseDate(body.recordDate);
      if (!recordDate) {
        return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
      }
    }

    const recordDate = body.recordDate ? parseDate(body.recordDate) : undefined;

    const row = await prisma.qualityScore.update({
      where: { id },
      data: {
        ...(body.personelName ? { personelName: body.personelName.trim() } : {}),
        ...(body.phone ? { phone: body.phone.trim() } : {}),
        ...(body.score != null ? { score: body.score } : {}),
        ...(body.note !== undefined ? { note: body.note?.trim() || null } : {}),
        ...(recordDate ? { recordDate } : {}),
      },
    });
    logActivity(
      auth.user!,
      "KALITE_GUNCELLE",
      `Kalite puanını güncelledi: ${row.personelName} — puan ${row.score}.`,
      { moduleKey: "KALITE", metadata: { recordId: row.id } },
    );
    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
    }
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await params;

  const existing = await prisma.qualityScore.findUnique({
    where: { id },
    select: { createdById: true, personelName: true, score: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.qualityScore.delete({ where: { id } });
  logActivity(
    auth.user!,
    "KALITE_SIL",
    `Kalite puan kaydını sildi: ${existing.personelName} — puan ${existing.score}.`,
    { moduleKey: "KALITE", metadata: { recordId: id } },
  );
  return NextResponse.json({ ok: true });
}
