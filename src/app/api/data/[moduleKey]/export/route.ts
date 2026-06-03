import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  EXCEL_MODULE_KEYS,
  excelRowIdsMatchingSearch,
  parseModuleKeyParam,
  SHEET_MODULE_KEYS,
  sheetRowIdsMatchingSearch,
} from "@/lib/data-query";
import { rowsToWorkbook } from "@/lib/excel";
import { moduleRowDateFilter, parseDate, requireApiUser } from "@/lib/api-helpers";
import { moduleUsesDateRangeFilter } from "@/lib/date-parse";
import { personelRowToExportRecord } from "@/lib/sheet-parsers/personel";
import {
  buildPuantajSummary,
  filterPuantajSummaryBySearch,
} from "@/lib/puantaj-summary";
import { EXPORT_ROW_LIMIT } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleKey: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { moduleKey: rawKey } = await params;
  const moduleKey = parseModuleKeyParam(rawKey);
  if (!moduleKey) {
    return NextResponse.json({ error: "Geçersiz modül" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const filters: Array<Record<string, unknown>> = [];
  if (moduleUsesDateRangeFilter(moduleKey)) {
    const dateFilter = moduleRowDateFilter(from, to);
    if (dateFilter) filters.push(dateFilter);
  }

  let exportRows: Record<string, unknown>[] = [];

  if (SHEET_MODULE_KEYS.includes(moduleKey)) {
    if (moduleKey === "PUANTAJ") {
      const dailyRows = await prisma.sheetDataRow.findMany({
        where: { moduleKey: "PUANTAJ" },
        select: { personelName: true, recordDate: true, rowData: true },
        take: EXPORT_ROW_LIMIT,
      });

      let summary = buildPuantajSummary(
        dailyRows.map((r) => ({
          personelName: r.personelName,
          recordDate: r.recordDate,
          rowData: r.rowData as Record<string, unknown>,
        })),
        from,
        to,
      );
      summary = filterPuantajSummaryBySearch(summary, search);

      exportRows = summary.map((r) => ({
        Personel: r.personelName,
        "Total Mesai": r.totalMesai,
        "Total İzin": r.totalIzin,
      }));
    } else if (search) {
      const ids = await sheetRowIdsMatchingSearch(moduleKey, search);
      if (ids.length === 0) {
        exportRows = [];
      } else {
        filters.push({ id: { in: ids } });
      }
    }

    if (
      moduleKey !== "PUANTAJ" &&
      (!search || filters.some((f) => "id" in f))
    ) {
      const rows = await prisma.sheetDataRow.findMany({
        where: {
          moduleKey,
          ...(filters.length ? { AND: filters } : {}),
        },
        include: { syncBatch: true },
        orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
        take: EXPORT_ROW_LIMIT,
      });

      exportRows =
        moduleKey === "PERSONEL"
          ? rows.map((r) =>
              personelRowToExportRecord({
                personelName: r.personelName,
                data: r.rowData as Record<string, string>,
              }),
            )
          : rows.map((r) => ({
              ...(r.rowData as Record<string, unknown>),
              personel: r.personelName,
              tarih: r.recordDate?.toISOString().slice(0, 10) ?? "",
              senkron: r.syncBatch.syncedAt.toISOString(),
            }));
    }
  } else if (EXCEL_MODULE_KEYS.includes(moduleKey)) {
    if (search) {
      const ids = await excelRowIdsMatchingSearch(moduleKey, search);
      if (ids.length === 0) {
        exportRows = [];
      } else {
        filters.push({ id: { in: ids } });
      }
    }

    if (!search || filters.some((f) => "id" in f)) {
      const rows = await prisma.excelDataRow.findMany({
        where: {
          moduleKey,
          ...(filters.length ? { AND: filters } : {}),
        },
        orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
        take: EXPORT_ROW_LIMIT,
      });

      exportRows = rows.map((r) => ({
        ...(r.rowData as Record<string, unknown>),
        personel: r.personelName,
        tarih: r.recordDate?.toISOString().slice(0, 10) ?? "",
      }));
    }
  } else {
    return NextResponse.json({ error: "Geçersiz modül" }, { status: 400 });
  }

  const buffer = rowsToWorkbook(exportRows, moduleKey);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${moduleKey.toLowerCase()}-${Date.now()}.xlsx"`,
    },
  });
}
