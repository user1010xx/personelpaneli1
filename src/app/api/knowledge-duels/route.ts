import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonResponse, parseDate, requireApiUser } from "@/lib/api-helpers";
import {
  buildKnowledgeDuelSummary,
  countKnowledgeDuelsByPeriod,
  isKnowledgeDuelUniqueError,
  knowledgeDuelDateRange,
  knowledgeDuelDayBounds,
  knowledgeDuelPersonelKey,
  knowledgeDuelRecordDate,
  KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE,
  type KnowledgeDuelResult,
} from "@/lib/knowledge-duel";
import { logActivity } from "@/lib/activity-log";
import { AGGREGATE_ROW_LIMIT } from "@/lib/validation";

const createSchema = z.object({
  personelName: z.string().trim().min(2, "Personel adı en az 2 karakter olmalı"),
  recordDate: z.string().min(1, "Tarih gerekli"),
  result: z.enum(["DOGRU", "YANLIS"], {
    errorMap: () => ({ message: "Sonuç doğru veya yanlış olmalı" }),
  }),
});

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where = {
    ...(search
      ? { personelName: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(from || to ? { recordDate: knowledgeDuelDateRange(from, to) } : {}),
  };

  const rows = await prisma.knowledgeDuel.findMany({
    where,
    orderBy: [{ recordDate: sortDir }, { createdAt: sortDir }],
    take: AGGREGATE_ROW_LIMIT,
  });

  const periodSource = rows.map((row) => ({
    personelName: row.personelName,
    result: row.result as KnowledgeDuelResult,
    recordDate: row.recordDate,
    createdAt: row.createdAt,
  }));

  return jsonResponse({
    rows,
    summary: buildKnowledgeDuelSummary(rows),
    total: rows.length,
    truncated: rows.length >= AGGREGATE_ROW_LIMIT,
    periodCounts: {
      daily: countKnowledgeDuelsByPeriod(periodSource, "daily"),
      weekly: countKnowledgeDuelsByPeriod(periodSource, "weekly"),
      monthly: countKnowledgeDuelsByPeriod(periodSource, "monthly"),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = createSchema.parse(await request.json());
    const parsedDate = parseDate(body.recordDate);
    if (!parsedDate) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    const recordDate = knowledgeDuelRecordDate(parsedDate);
    const personelKey = knowledgeDuelPersonelKey(body.personelName);

    const existing = await prisma.knowledgeDuel.findFirst({
      where: {
        personelKey,
        recordDate: knowledgeDuelDayBounds(recordDate),
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE }, { status: 409 });
    }

    const row = await prisma.knowledgeDuel.create({
      data: {
        personelName: body.personelName,
        personelKey,
        recordDate,
        result: body.result,
        createdById: auth.user!.id,
      },
    });

    logActivity(
      auth.user!,
      "BILGI_DUELLOSU_EKLE",
      `Bilgi duellosu ekledi: ${body.personelName}.`,
      {
        moduleKey: "KNOWLEDGE_DUEL",
        metadata: {
          recordId: row.id,
          personelName: row.personelName,
          result: row.result,
          recordDate: body.recordDate,
        },
      },
    );

    return jsonResponse({ row }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Geçersiz form verisi" },
        { status: 400 },
      );
    }
    if (isKnowledgeDuelUniqueError(error)) {
      return NextResponse.json({ error: KNOWLEDGE_DUEL_DAILY_LIMIT_MESSAGE }, { status: 409 });
    }
    console.error("[knowledge-duels POST]", error);
    return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 400 });
  }
}
