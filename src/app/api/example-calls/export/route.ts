import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { buildExampleCallSummary, exampleCallDateRange } from "@/lib/example-call";
import { rowsToWorkbook } from "@/lib/excel-export";
import { EXPORT_ROW_LIMIT } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const rows = await prisma.exampleCall.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { personelName: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(from || to ? { recordDate: exampleCallDateRange(from, to) } : {}),
    },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: EXPORT_ROW_LIMIT,
  });

  const buffer = await rowsToWorkbook(
    [
      ...buildExampleCallSummary(rows).map((row) => ({
        personel_adi: row.personelName,
        adet: row.adet,
      })),
      {
        personel_adi: "Toplam",
        adet: rows.length,
      },
    ],
    "Ornek Cagri",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ornek-cagri-${Date.now()}.xlsx"`,
    },
  });
}
