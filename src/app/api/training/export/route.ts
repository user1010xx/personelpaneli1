import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rowsToWorkbook } from "@/lib/excel-export";
import { TRAINING_RECORD_LABELS, trainingDateRange } from "@/lib/training";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { EXPORT_ROW_LIMIT } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const rows = await prisma.trainingFeedback.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { personelName: { contains: search, mode: "insensitive" } },
              { topic: { contains: search, mode: "insensitive" } },
              { trainer: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(from || to ? { recordDate: trainingDateRange(from, to) } : {}),
    },
    orderBy: { recordDate: "desc" },
    take: EXPORT_ROW_LIMIT,
  });

  const buffer = await rowsToWorkbook(
    rows.map((r) => ({
      olusturulma_tarihi: r.createdAt.toLocaleString("tr-TR"),
      personel_adi: r.personelName,
      tur: TRAINING_RECORD_LABELS[r.recordType],
      is_tarihi: r.recordDate.toISOString().slice(0, 10),
      baslangic: r.startTime,
      bitis: r.endTime,
      konu: r.topic,
      egitmen: r.trainer,
    })),
    "Egitim Geribildirim",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="egitim-${Date.now()}.xlsx"`,
    },
  });
}
