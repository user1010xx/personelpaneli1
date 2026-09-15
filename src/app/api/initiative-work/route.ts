import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonResponse, parseDate, requireApiUser } from "@/lib/api-helpers";
import {
  buildInitiativeWorkSummary,
  initiativeWorkDateRange,
  parseWorkDuration,
} from "@/lib/initiative-work";
import { logActivity } from "@/lib/activity-log";
import { AGGREGATE_ROW_LIMIT } from "@/lib/validation";
import {
  personelNameSchema,
  personelNamesSchema,
  requirePersonnel,
  resolveCanonicalPersonnelNames,
  uniquePersonnel,
} from "@/lib/personnel-batch";

const createSchema = z
  .object({
    personelName: personelNameSchema.optional(),
    personelNames: personelNamesSchema,
    recordDate: z.string().min(1, "Çalıştığı tarih gerekli"),
    callCount: z.number().int().min(0, "Arama adedi 0 veya üzeri olmalı"),
    talkDuration: z.string().trim().min(1, "Konuşma süresi gerekli"),
    memberCount: z.number().int().min(0, "Üye adedi 0 veya üzeri olmalı"),
  })
  .superRefine(requirePersonnel);

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where = {
    ...(search ? { personelName: { contains: search, mode: "insensitive" as const } } : {}),
    ...(from || to ? { recordDate: initiativeWorkDateRange(from, to) } : {}),
  };

  const rows = await prisma.initiativeWork.findMany({
    where,
    orderBy: [{ recordDate: sortDir }, { createdAt: sortDir }],
    take: AGGREGATE_ROW_LIMIT,
  });

  return jsonResponse({
    rows,
    summary: buildInitiativeWorkSummary(rows),
    total: rows.length,
    truncated: rows.length >= AGGREGATE_ROW_LIMIT,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = createSchema.parse(await request.json());
    const recordDate = parseDate(body.recordDate);
    if (!recordDate) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    const talkDurationSeconds = parseWorkDuration(body.talkDuration);
    if (talkDurationSeconds === null) {
      return NextResponse.json(
        { error: "Konuşma süresi saniye veya SS:DD:SS formatında olmalı" },
        { status: 400 },
      );
    }

    const personelNames = await resolveCanonicalPersonnelNames(uniquePersonnel(body));
    const rows = await prisma.$transaction(
      personelNames.map((personelName) =>
        prisma.initiativeWork.create({
          data: {
            personelName,
            recordDate,
            callCount: body.callCount,
            talkDurationSeconds,
            memberCount: body.memberCount,
            createdById: auth.user!.id,
          },
        }),
      ),
    );

    logActivity(
      auth.user!,
      "INSIYATIF_CALISMA_EKLE",
      `İnsiyatif çalışma kaydı ekledi: ${personelNames.join(", ")} (${body.recordDate}).`,
      {
        moduleKey: "INITIATIVE_WORK",
        metadata: {
          recordIds: rows.map((row) => row.id),
          personelNames,
          recordCount: rows.length,
          recordDate: body.recordDate,
          callCount: body.callCount,
          memberCount: body.memberCount,
        },
      },
    );

    return jsonResponse({ row: rows[0], rows, count: rows.length }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Geçersiz form verisi" },
        { status: 400 },
      );
    }
    console.error("[initiative-work POST]", error);
    return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 400 });
  }
}