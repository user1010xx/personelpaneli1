import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rowsToWorkbook } from "@/lib/excel";
import { buildQualitySummary, qualityDateRange } from "@/lib/quality";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { loadPersonelAliases } from "@/lib/personel-alias";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const [rows, aliases] = await Promise.all([
    prisma.qualityScore.findMany({
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
      select: { personelName: true, score: true },
      orderBy: { personelName: "asc" },
    }),
    loadPersonelAliases("KALITE"),
  ]);

  const summary = buildQualitySummary(rows, aliases);
  const totalAdet = summary.reduce((total, row) => total + row.adet, 0);
  const totalScore = rows.reduce((total, row) => total + row.score, 0);
  const totalOrtalama = totalAdet > 0 ? Number((totalScore / totalAdet).toFixed(2)) : 0;

  const buffer = await rowsToWorkbook(
    [
      ...summary.map((row) => ({
        personel_adi: row.personelName,
        total_dinlenilen_adet: row.adet,
        ortalama: row.ortalama,
      })),
      {
        personel_adi: "Toplam",
        total_dinlenilen_adet: totalAdet,
        ortalama: totalOrtalama,
      },
    ],
    "Kalite Ozeti",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kalite-${Date.now()}.xlsx"`,
    },
  });
}
