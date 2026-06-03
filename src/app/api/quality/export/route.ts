import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rowsToWorkbook } from "@/lib/excel";
import { qualityDateRange } from "@/lib/quality";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { EXPORT_ROW_LIMIT } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const rows = await prisma.qualityScore.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { personelName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { note: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(from || to ? { recordDate: qualityDateRange(from, to) } : {}),
    },
    orderBy: { recordDate: "desc" },
    take: EXPORT_ROW_LIMIT,
  });

  const buffer = rowsToWorkbook(
    rows.map((r) => ({
      kayit_tarihi: r.createdAt.toLocaleString("tr-TR"),
      personel_adi: r.personelName,
      telefon: r.phone,
      puan: r.score,
      not: r.note ?? "",
      tarih: r.recordDate.toISOString().slice(0, 10),
    })),
    "Kalite Puanlari",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kalite-${Date.now()}.xlsx"`,
    },
  });
}
