import { prisma } from "@/lib/db";
import {
  buildPuantajSummary,
  filterPuantajSummaryBySearch,
  resolvePuantajDateRange,
  sortPuantajSummary,
} from "@/lib/puantaj-summary";

const PUANTAJ_ROW_LIMIT = 100_000;

export type PuantajStatRow = {
  recordDate: Date | null;
  createdAt: Date;
  personelName: string | null;
  rowData: Record<string, unknown>;
};

async function loadPuantajDailyRows() {
  return prisma.sheetDataRow.findMany({
    where: { moduleKey: "PUANTAJ" },
    select: {
      personelName: true,
      recordDate: true,
      rowData: true,
      createdAt: true,
    },
    take: PUANTAJ_ROW_LIMIT,
  });
}

function toPuantajStatRows(
  dailyRows: Awaited<ReturnType<typeof loadPuantajDailyRows>>,
): PuantajStatRow[] {
  return dailyRows.map((r) => ({
    personelName: r.personelName,
    recordDate: r.recordDate,
    createdAt: r.createdAt,
    rowData: r.rowData as Record<string, unknown>,
  }));
}

/** İstatistik barları için günlük satırlar (tek sorgu) */
export async function loadPuantajStatRows() {
  const dailyRows = await loadPuantajDailyRows();
  return {
    statRows: toPuantajStatRows(dailyRows),
    dailyRowCount: dailyRows.length,
  };
}

export async function fetchPuantajSummaryResponse(params: {
  search: string;
  from: Date | null;
  to: Date | null;
  sortBy: string;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}) {
  const { from: rangeFrom, to: rangeTo } = resolvePuantajDateRange(params.from, params.to);

  const { statRows, dailyRowCount } = await loadPuantajStatRows();

  let summary = buildPuantajSummary(
    statRows.map((r) => ({
      personelName: r.personelName,
      recordDate: r.recordDate,
      rowData: r.rowData,
    })),
    params.from,
    params.to,
  );

  summary = filterPuantajSummaryBySearch(summary, params.search);
  summary = sortPuantajSummary(summary, params.sortBy, params.sortDir);

  const total = summary.length;
  const page = Math.max(params.page, 1);
  const pageSize = params.pageSize;
  const slice = summary.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows: slice.map((r) => ({
      id: r.id,
      personelName: r.personelName,
      recordDate: null,
      createdAt: new Date(),
      data: {
        "Total Mesai": String(r.totalMesai),
        "Total İzin": String(r.totalIzin),
      },
    })),
    total,
    page,
    pageSize,
    rangeFrom,
    rangeTo,
    statRows,
    dailyRowCount,
  };
}
