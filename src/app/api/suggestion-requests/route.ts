import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonResponse, parseDate, requireApiUserFromDb } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";
import { endOfDay, startOfDay } from "date-fns";

const createSchema = z.object({
  type: z.enum(["TALEP", "ONERI"]),
  reporterName: z.string().trim().min(2, "İleten kişi gerekli").max(120),
  subject: z.string().trim().min(2, "Konu gerekli").max(180),
  content: z.string().trim().min(3, "İçerik gerekli").max(4000),
});

export async function GET(request: Request) {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const MAX_ROWS = 5_000;
  const rows = await prisma.suggestionRequest.findMany({
    where:
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: startOfDay(from) } : {}),
              ...(to ? { lte: endOfDay(to) } : {}),
            },
          }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return jsonResponse({
    rows: rows.map((row) => ({
      id: row.id,
      type: row.type,
      reporterName: row.reporterName,
      subject: row.subject,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdById: row.createdById,
      createdByName: row.createdBy?.name ?? null,
      canModify: auth.user!.role === "ADMIN" || auth.user!.id === row.createdById,
    })),
    truncated: rows.length >= MAX_ROWS,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz veri" },
      { status: 400 },
    );
  }

  const row = await prisma.suggestionRequest.create({
    data: {
      ...body.data,
      createdById: auth.user!.id,
    },
  });

  logActivity(
    auth.user!,
    "ONERI_TALEP_EKLE",
    `${body.data.type === "TALEP" ? "Talep" : "Öneri"} ekledi: ${body.data.subject}`,
    {
      moduleKey: "SUGGESTION_REQUEST",
      metadata: {
        id: row.id,
        type: body.data.type,
        reporterName: body.data.reporterName,
        subject: body.data.subject,
      },
    },
  );

  return jsonResponse({ id: row.id }, 201);
}