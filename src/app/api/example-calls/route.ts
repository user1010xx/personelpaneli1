import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonResponse, parseDate, requireApiUser } from "@/lib/api-helpers";
import {
  buildExampleCallSummary,
  countExampleCallsByPeriod,
  exampleCallDateRange,
  type ExampleCallType,
} from "@/lib/example-call";
import { logActivity } from "@/lib/activity-log";
import { AGGREGATE_ROW_LIMIT } from "@/lib/validation";

const createSchema = z
  .object({
    recordType: z.enum(["ORNEK_CAGRI", "MOTIVASYON"]),
    personelName: z.string().trim().min(2, "Personel adı en az 2 karakter olmalı"),
    recordDate: z.string().min(1, "Tarih gerekli"),
    phone: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recordType === "ORNEK_CAGRI" && (!data.phone || data.phone.length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Örnek çağrı için numara en az 5 karakter olmalı",
      });
    }
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
      ? {
          OR: [
            { personelName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(from || to ? { recordDate: exampleCallDateRange(from, to) } : {}),
  };

  const rows = await prisma.exampleCall.findMany({
    where,
    orderBy: [{ recordDate: sortDir }, { createdAt: sortDir }],
    take: AGGREGATE_ROW_LIMIT,
  });

  const periodSource = rows.map((row) => ({
    personelName: row.personelName,
    recordType: row.recordType as ExampleCallType,
    recordDate: row.recordDate,
    createdAt: row.createdAt,
  }));

  return jsonResponse({
    rows,
    summary: buildExampleCallSummary(rows),
    total: rows.length,
    truncated: rows.length >= AGGREGATE_ROW_LIMIT,
    periodCounts: {
      daily: countExampleCallsByPeriod(periodSource, "daily"),
      weekly: countExampleCallsByPeriod(periodSource, "weekly"),
      monthly: countExampleCallsByPeriod(periodSource, "monthly"),
    },
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

    const phone = body.recordType === "ORNEK_CAGRI" ? body.phone ?? "" : "";
    const row = await prisma.exampleCall.create({
      data: {
        personelName: body.personelName,
        recordType: body.recordType,
        phone,
        recordDate,
        createdById: auth.user!.id,
      },
    });

    logActivity(
      auth.user!,
      "ORNEK_CAGRI_EKLE",
      `${body.recordType === "MOTIVASYON" ? "Motivasyon" : "Örnek çağrı"} ekledi: ${body.personelName}.`,
      {
        moduleKey: "EXAMPLE_CALL",
        metadata: {
          recordId: row.id,
          personelName: row.personelName,
          recordType: row.recordType,
          phone: row.phone,
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
    console.error("[example-calls POST]", error);
    return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 400 });
  }
}
