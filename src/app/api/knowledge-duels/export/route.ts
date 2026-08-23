import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDate, requireApiUser } from "@/lib/api-helpers";
import { KNOWLEDGE_DUEL_RESULT_LABELS, knowledgeDuelDateRange } from "@/lib/knowledge-duel";
import { rowsToWorkbook } from "@/lib/excel-export";
import { EXPORT_ROW_LIMIT } from "@/lib/validation";
import { formatAppDateTime } from "@/lib/timezone";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const rows = await prisma.knowledgeDuel.findMany({
    where: {
      ...(search
        ? { personelName: { contains: search, mode: "insensitive" as const } }
        : {}),
      ...(from || to ? { recordDate: knowledgeDuelDateRange(from, to) } : {}),
    },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: EXPORT_ROW_LIMIT,
  });

  const buffer = await rowsToWorkbook(
    rows.map((row) => ({
      olusturulma_tarihi: formatAppDateTime(row.createdAt),
      personel_adi: row.personelName,
      sonuc: KNOWLEDGE_DUEL_RESULT_LABELS[row.result],
      is_tarihi: row.recordDate.toISOString().slice(0, 10),
    })),
    "Bilgi Duellosu",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bilgi-duellosu-${Date.now()}.xlsx"`,
    },
  });
}
