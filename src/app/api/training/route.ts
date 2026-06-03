import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { countTrainingByPeriod, buildTrainingSummary, trainingDateRange } from "@/lib/training";
import { jsonResponse, parseDate, parsePeriod, requireApiUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";
import { timeStringSchema } from "@/lib/validation";
import { loadPersonelAliases } from "@/lib/personel-alias";

const MAX_PAGE_SIZE = 200;

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const period = parsePeriod(searchParams.get("period"));
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "100"), 1), MAX_PAGE_SIZE);

    const filters: Array<Record<string, unknown>> = [];
    if (search) {
      filters.push({
        OR: [
          { personelName: { contains: search, mode: "insensitive" } },
          { topic: { contains: search, mode: "insensitive" } },
          { trainer: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (from || to) {
      filters.push({ recordDate: trainingDateRange(from, to) });
    }

    const where = filters.length ? { AND: filters } : undefined;

    const [total, rows, aggregateRows, aliases] = await Promise.all([
      prisma.trainingFeedback.count({ where }),
      prisma.trainingFeedback.findMany({
        where,
        orderBy: [{ recordDate: sortDir }, { createdAt: sortDir }],
        include: { createdBy: { select: { name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.trainingFeedback.findMany({
        where,
        select: {
          personelName: true,
          recordType: true,
          recordDate: true,
          createdAt: true,
        },
      }),
      loadPersonelAliases("EGITIM"),
    ]);

    const summary = buildTrainingSummary(
      aggregateRows.map((r) => ({
        personelName: r.personelName,
        recordType: r.recordType ?? "EGITIM",
      })),
      aliases,
    );

    const periodCounts = {
      daily: countTrainingByPeriod(aggregateRows, "daily", undefined, aliases),
      weekly: countTrainingByPeriod(aggregateRows, "weekly", undefined, aliases),
      monthly: countTrainingByPeriod(aggregateRows, "monthly", undefined, aliases),
    };

    return jsonResponse({
      rows,
      summary,
      total,
      page,
      pageSize,
      periodCounts,
      period,
    });
  } catch (error) {
    console.error("[training GET]", error);
    return NextResponse.json(
      { error: "Kayıtlar yüklenemedi. Sunucuyu yeniden başlatıp tekrar deneyin." },
      { status: 500 },
    );
  }
}

const recordTypeSchema = z.enum(["EGITIM", "GERIBILDIRIM"]);

const createSchema = z
  .object({
    personelName: z.string().trim().min(2, "Personel adı en az 2 karakter olmalı"),
    recordType: recordTypeSchema,
    recordDate: z.string().min(1),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    topic: z.string().trim().min(1, "Konu zorunludur"),
    trainer: z.string().trim().min(1, "Eğitimi veren zorunludur"),
  })
  .superRefine((data, ctx) => {
    const [sh, sm] = data.startTime.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bitiş saati başlangıçtan sonra olmalı",
        path: ["endTime"],
      });
    }
  });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = createSchema.parse(await request.json());
    const recordDate = parseDate(body.recordDate);
    if (!recordDate) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    const row = await prisma.trainingFeedback.create({
      data: {
        personelName: body.personelName,
        recordType: body.recordType,
        recordDate,
        startTime: body.startTime,
        endTime: body.endTime,
        topic: body.topic,
        trainer: body.trainer,
        createdById: auth.user!.id,
      },
    });
    logActivity(
      auth.user!,
      "EGITIM_EKLE",
      `Eğitim kaydı oluşturdu: ${body.personelName} — ${body.topic} (${body.recordDate}, ${body.startTime}-${body.endTime}).`,
      { moduleKey: "EGITIM", metadata: { recordId: row.id } },
    );
    return jsonResponse({ row }, 201);
  } catch (error) {
    console.error("[training POST]", error);
    if (error instanceof z.ZodError) {
      const first = error.errors[0]?.message ?? "Geçersiz form verisi";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Kayıt oluşturulamadı. Veritabanı güncel mi kontrol edin (prisma migrate)." },
      { status: 400 },
    );
  }
}
