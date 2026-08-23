import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { canModifyRecord } from "@/lib/record-auth";
import { logActivity } from "@/lib/activity-log";
import {
  isKnowledgeDuelUniqueError,
  knowledgeDuelDayBounds,
  knowledgeDuelPersonelKey,
  knowledgeDuelRecordDate,
  KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE,
} from "@/lib/knowledge-duel";

const updateSchema = z.object({
  personelName: z.string().trim().min(2).optional(),
  recordDate: z.string().optional(),
  result: z.enum(["DOGRU", "YANLIS"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const existing = await prisma.knowledgeDuel.findUnique({
    where: { id },
    select: {
      createdById: true,
      personelName: true,
      personelKey: true,
      recordDate: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı düzenleme yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const parsedDate = body.recordDate ? parseDate(body.recordDate) : undefined;
    if (body.recordDate && !parsedDate) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    const nextName = body.personelName ?? existing.personelName;
    const nextKey = knowledgeDuelPersonelKey(nextName);
    const nextDate = parsedDate ? knowledgeDuelRecordDate(parsedDate) : existing.recordDate;

    const clash = await prisma.knowledgeDuel.findFirst({
      where: {
        id: { not: id },
        personelKey: nextKey,
        recordDate: knowledgeDuelDayBounds(nextDate),
      },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ error: KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE }, { status: 409 });
    }

    const row = await prisma.knowledgeDuel.update({
      where: { id },
      data: {
        personelName: nextName,
        personelKey: nextKey,
        recordDate: nextDate,
        ...(body.result ? { result: body.result } : {}),
      },
    });

    logActivity(
      auth.user!,
      "BILGI_DUELLOSU_GUNCELLE",
      `Bilgi duellosu güncelledi: ${row.personelName}.`,
      {
        moduleKey: "KNOWLEDGE_DUEL",
        metadata: {
          recordId: row.id,
          personelName: row.personelName,
          result: row.result,
        },
      },
    );

    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
    }
    if (isKnowledgeDuelUniqueError(error)) {
      return NextResponse.json({ error: KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE }, { status: 409 });
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
  const existing = await prisma.knowledgeDuel.findUnique({
    where: { id },
    select: { createdById: true, personelName: true, result: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!canModifyRecord(auth.user!, existing.createdById)) {
    return NextResponse.json({ error: "Bu kaydı silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.knowledgeDuel.delete({ where: { id } });
  logActivity(
    auth.user!,
    "BILGI_DUELLOSU_SIL",
    `Bilgi duellosu sildi: ${existing.personelName}.`,
    {
      moduleKey: "KNOWLEDGE_DUEL",
      metadata: {
        recordId: id,
        personelName: existing.personelName,
        result: existing.result,
      },
    },
  );
  return NextResponse.json({ ok: true });
}
