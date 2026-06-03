import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeModuleStats } from "@/lib/stats";
import { averageScore, buildQualitySummary, qualityDateRange } from "@/lib/quality";
import { jsonResponse, parseDate, parsePeriod, requireApiUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

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
          { phone: { contains: search, mode: "insensitive" } },
          { note: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (from || to) {
      filters.push({ recordDate: qualityDateRange(from, to) });
    }

    const where = filters.length ? { AND: filters } : undefined;

    const [total, rows] = await Promise.all([
      prisma.qualityScore.count({ where }),
      prisma.qualityScore.findMany({
        where,
        orderBy: [{ recordDate: sortDir }, { createdAt: sortDir }],
        include: { createdBy: { select: { name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const summary = buildQualitySummary(
      rows.map((r) => ({ personelName: r.personelName, score: r.score })),
    );

    const statRows = rows.map((r) => ({
      recordDate: r.recordDate,
      createdAt: r.createdAt,
      personelName: r.personelName,
      rowData: { puan: r.score, personelName: r.personelName },
    }));

    const stats = {
      daily: computeModuleStats(statRows, "daily"),
      weekly: computeModuleStats(statRows, "weekly"),
      monthly: computeModuleStats(statRows, "monthly"),
      active: computeModuleStats(statRows, period),
    };

    const periodAverages = {
      daily: pickScoreAverage(stats.daily),
      weekly: pickScoreAverage(stats.weekly),
      monthly: pickScoreAverage(stats.monthly),
    };

    return jsonResponse({
      rows,
      summary,
      total,
      page,
      pageSize,
      stats,
      periodAverages,
      summaryOrtalama: averageScore(rows),
    });
  } catch (error) {
    console.error("[quality GET]", error);
    return NextResponse.json({ error: "Kayıtlar yüklenemedi" }, { status: 500 });
  }
}

function pickScoreAverage(stat: { averages: { key: string; value: number }[] }) {
  return stat.averages.find((a) => a.key === "puan")?.value ?? 0;
}

const createSchema = z.object({
  personelName: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  score: z.number().min(0).max(100),
  note: z.string().optional(),
  recordDate: z.string().min(1),
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

    const row = await prisma.qualityScore.create({
      data: {
        personelName: body.personelName,
        phone: body.phone,
        score: body.score,
        note: body.note?.trim() || null,
        recordDate,
        createdById: auth.user!.id,
      },
    });
    logActivity(
      auth.user!,
      "KALITE_EKLE",
      `Kalite puanı ekledi: ${body.personelName} — puan ${body.score} (${body.recordDate}).`,
      { moduleKey: "KALITE", metadata: { recordId: row.id } },
    );
    return jsonResponse({ row }, 201);
  } catch (error) {
    console.error("[quality POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Geçersiz form" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 400 });
  }
}
