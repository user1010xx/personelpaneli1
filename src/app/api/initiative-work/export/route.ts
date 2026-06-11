import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import {
  buildInitiativeWorkSummary,
  initiativeWorkDateRange,
} from "@/lib/initiative-work";
import { rowsToWorkbook } from "@/lib/excel";

const EXPORT_LIMIT = 100_000;

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const rows = await prisma.initiativeWork.findMany({
    where: {
      ...(search ? { personelName: { contains: search, mode: "insensitive" as const } } : {}),
      ...(from || to ? { recordDate: initiativeWorkDateRange(from, to) } : {}),
    },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: EXPORT_LIMIT,
  });

  const buffer = await rowsToWorkbook(
    [
      ...buildInitiativeWorkSummary(rows).map((row) => ({
        personel_adi: row.personelName,
        adet: row.calismaAdedi,
      })),
      {
        personel_adi: "Toplam",
        adet: rows.length,
      },
    ],
    "Calisma Ozeti",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="insiyatif-calisma-${Date.now()}.xlsx"`,
    },
  });
}