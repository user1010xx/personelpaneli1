import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { canModifyRecord } from "@/lib/record-auth";
import { parseWorkDuration } from "@/lib/initiative-work";
import { logActivity } from "@/lib/activity-log";

const updateSchema = z.object({
  personelName: z.string().trim().min(2).optional(),
  recordDate: z.string().optional(),
  callCount: z.number().int().min(0).optional(),
  talkDuration: z.string().trim().min(1).optional(),
  memberCount: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const existing = await prisma.initiativeWork.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı düzenleme yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const recordDate = body.recordDate ? parseDate(body.recordDate) : undefined;
    if (body.recordDate && !recordDate) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    const talkDurationSeconds = body.talkDuration
      ? parseWorkDuration(body.talkDuration)
      : undefined;
    if (body.talkDuration && talkDurationSeconds === null) {
      return NextResponse.json(
        { error: "Konuşma süresi saniye veya SS:DD:SS formatında olmalı" },
        { status: 400 },
      );
    }

    const row = await prisma.initiativeWork.update({
      where: { id },
      data: {
        ...(body.personelName ? { personelName: body.personelName } : {}),
        ...(recordDate ? { recordDate } : {}),
        ...(typeof body.callCount === "number" ? { callCount: body.callCount } : {}),
        ...(typeof talkDurationSeconds === "number" ? { talkDurationSeconds } : {}),
        ...(typeof body.memberCount === "number" ? { memberCount: body.memberCount } : {}),
      },
    });

    logActivity(
      auth.user!,
      "INSIYATIF_CALISMA_GUNCELLE",
      `İnsiyatif çalışma kaydını güncelledi: ${row.personelName}.`,
      { moduleKey: "INITIATIVE_WORK", metadata: { recordId: row.id, personelName: row.personelName } },
    );

    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
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
  const existing = await prisma.initiativeWork.findUnique({
    where: { id },
    select: { createdById: true, personelName: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.initiativeWork.delete({ where: { id } });
  logActivity(
    auth.user!,
    "INSIYATIF_CALISMA_SIL",
    `İnsiyatif çalışma kaydını sildi: ${existing.personelName}.`,
    { moduleKey: "INITIATIVE_WORK", metadata: { recordId: id, personelName: existing.personelName } },
  );
  return NextResponse.json({ ok: true });
}