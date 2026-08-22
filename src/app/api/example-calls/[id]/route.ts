import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { canModifyRecord } from "@/lib/record-auth";
import { logActivity } from "@/lib/activity-log";

const updateSchema = z.object({
  personelName: z.string().trim().min(2).optional(),
  recordDate: z.string().optional(),
  phone: z.string().trim().min(5).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const existing = await prisma.exampleCall.findUnique({
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

    const row = await prisma.exampleCall.update({
      where: { id },
      data: {
        ...(body.personelName ? { personelName: body.personelName } : {}),
        ...(recordDate ? { recordDate } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      },
    });

    logActivity(
      auth.user!,
      "ORNEK_CAGRI_GUNCELLE",
      `Örnek çağrı / motivasyon güncelledi: ${row.personelName}.`,
      {
        moduleKey: "EXAMPLE_CALL",
        metadata: { recordId: row.id, personelName: row.personelName, phone: row.phone },
      },
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
  const existing = await prisma.exampleCall.findUnique({
    where: { id },
    select: { createdById: true, personelName: true, phone: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.exampleCall.delete({ where: { id } });
  logActivity(
    auth.user!,
    "ORNEK_CAGRI_SIL",
    `Örnek çağrı / motivasyon sildi: ${existing.personelName}.`,
    {
      moduleKey: "EXAMPLE_CALL",
      metadata: { recordId: id, personelName: existing.personelName, phone: existing.phone },
    },
  );
  return NextResponse.json({ ok: true });
}
