import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { canModifyRecord } from "@/lib/record-auth";
import { logActivity } from "@/lib/activity-log";
import { timeStringSchema } from "@/lib/validation";

const updateSchema = z
  .object({
    personelName: z.string().trim().min(2).optional(),
    recordType: z.enum(["EGITIM", "GERIBILDIRIM"]).optional(),
    recordDate: z.string().optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    topic: z.string().trim().min(1).optional(),
    trainer: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const [sh, sm] = data.startTime.split(":").map(Number);
        const [eh, em] = data.endTime.split(":").map(Number);
        return eh * 60 + em > sh * 60 + sm;
      }
      return true;
    },
    { message: "Bitiş saati başlangıçtan sonra olmalı" },
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.trainingFeedback.findUnique({
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
    const recordDate = body.recordDate ? parseDate(body.recordDate) : undefined;
    if (body.recordDate && !recordDate) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    const current = await prisma.trainingFeedback.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }

    const startTime = body.startTime ?? current.startTime;
    const endTime = body.endTime ?? current.endTime;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      return NextResponse.json(
        { error: "Bitiş saati başlangıçtan sonra olmalı" },
        { status: 400 },
      );
    }

    const row = await prisma.trainingFeedback.update({
      where: { id },
      data: {
        ...(body.personelName ? { personelName: body.personelName } : {}),
        ...(body.recordType ? { recordType: body.recordType } : {}),
        ...(recordDate ? { recordDate } : {}),
        ...(body.startTime ? { startTime: body.startTime } : {}),
        ...(body.endTime ? { endTime: body.endTime } : {}),
        ...(body.topic ? { topic: body.topic } : {}),
        ...(body.trainer ? { trainer: body.trainer } : {}),
      },
    });
    logActivity(
      auth.user!,
      "EGITIM_GUNCELLE",
      `Eğitim kaydını güncelledi: ${row.personelName} — ${row.topic}.`,
      { moduleKey: "EGITIM", metadata: { recordId: row.id } },
    );
    return NextResponse.json({ row });
  } catch (error) {
    console.error("[training PATCH]", error);
    if (error instanceof z.ZodError) {
      const first = error.errors[0]?.message ?? "Geçersiz form verisi";
      return NextResponse.json({ error: first }, { status: 400 });
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

  const existing = await prisma.trainingFeedback.findUnique({
    where: { id },
    select: { createdById: true, personelName: true, topic: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.trainingFeedback.delete({ where: { id } });
  logActivity(
    auth.user!,
    "EGITIM_SIL",
    `Eğitim kaydını sildi: ${existing.personelName} — ${existing.topic}.`,
    { moduleKey: "EGITIM", metadata: { recordId: id } },
  );
  return NextResponse.json({ ok: true });
}
