import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonResponse, requireApiUserFromDb } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

const createSchema = z.object({
  type: z.enum(["TALEP", "ONERI"]),
  reporterName: z.string().trim().min(2, "İleten kişi gerekli").max(120),
  subject: z.string().trim().min(2, "Konu gerekli").max(180),
  content: z.string().trim().min(3, "İçerik gerekli").max(4000),
});

export async function GET() {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const rows = await prisma.suggestionRequest.findMany({
    orderBy: { createdAt: "desc" },
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
    { moduleKey: "SUGGESTION_REQUEST", metadata: { id: row.id } },
  );

  return jsonResponse({ id: row.id }, 201);
}