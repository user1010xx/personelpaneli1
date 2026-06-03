import { NextResponse } from "next/server";
import type { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  EXCEL_MODULE_KEYS,
  excelRowIdsMatchingSearch,
  parseModuleKeyParam,
  SHEET_MODULE_KEYS,
  sheetRowIdsMatchingSearch,
} from "@/lib/data-query";
import { fetchPuantajSummaryResponse, loadPuantajStatRows } from "@/lib/puantaj-api";
import { resolvePuantajDateRange } from "@/lib/puantaj-summary";
import { computeSheetModuleStats } from "@/lib/sheet-stats";
import { computeModuleStats } from "@/lib/stats";
import { parseDurationOrNumber } from "@/lib/duration-parse";
import {
  jsonResponse,
  moduleRowDateFilter,
  parseDate,
  parsePeriod,
  requireApiUser,
} from "@/lib/api-helpers";
import { moduleUsesDateRangeFilter } from "@/lib/date-parse";
import {
  loadPersonelAliases,
  resolvePersonelBucketKey,
  resolvePersonelDisplayName,
} from "@/lib/personel-alias";

const STATS_ROW_LIMIT = 50_000;

const FIXED_EXCEL_MODULES = {
  UYE_ADEDI: {
    metrics: ["Üye Adedi", "İlk Yat Adedi"],
    durations: [],
  },
  CAGRI_SURECI: {
    metrics: ["Arama Adedi"],
    durations: ["Konuşma Süresi"],
  },
} as const;

function formatSeconds(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatDateLabel(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("tr-TR") : "";
}

function formatRangeLabel(from: Date | null, to: Date | null) {
  if (!from && !to) return "";
  if (from && to && from.toDateString() === to.toDateString()) return formatDateLabel(from);
  return `${from ? formatDateLabel(from) : "Başlangıç"} - ${to ? formatDateLabel(to) : "Bugün"}`;
}

function fixedExcelConfig(moduleKey: ModuleKey) {
  return FIXED_EXCEL_MODULES[moduleKey as keyof typeof FIXED_EXCEL_MODULES];
}

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
  const sortBy = searchParams.get("sortBy") ?? "date";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const period = parsePeriod(searchParams.get("period"));
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "50"), 1), 200);
  const includeStats = searchParams.get("includeStats") !== "0";
  const statsOnly = searchParams.get("statsOnly") === "1";

  if (SHEET_MODULE_KEYS.includes(moduleKey)) {
    if (moduleKey === "PUANTAJ") {
      const puantajSort =
        sortBy === "personel" ? "personel" : sortBy === "izin" ? "izin" : "mesai";

      if (statsOnly) {
        const { statRows, dailyRowCount } = await loadPuantajStatRows();
        const customRange = resolvePuantajDateRange(from, to);
        const statsForPeriod = (p: typeof period) =>
          computeSheetModuleStats(moduleKey, statRows, p, new Date());
        const statsForSelectedRange = () =>
          computeSheetModuleStats(moduleKey, statRows, "monthly", new Date(), customRange);

        return jsonResponse({
          stats: {
            daily: statsForPeriod("daily"),
            weekly: statsForPeriod("weekly"),
            monthly: statsForPeriod("monthly"),
            active: statsForSelectedRange(),
          },
          statsTruncated: dailyRowCount >= STATS_ROW_LIMIT,
        });
      }

      const puantajResult = await fetchPuantajSummaryResponse({
        search,
        from,
        to,
        sortBy: puantajSort,
        sortDir,
        page,
        pageSize,
      });

      const base = {
        rows: puantajResult.rows,
        total: puantajResult.total,
        page: puantajResult.page,
        pageSize: puantajResult.pageSize,
        puantajRange: {
          from: puantajResult.rangeFrom.toISOString(),
          to: puantajResult.rangeTo.toISOString(),
        },
      };

      if (!includeStats) {
        return jsonResponse(base);
      }

      const customRange = resolvePuantajDateRange(from, to);
      const statsForPeriod = (p: typeof period) =>
        computeSheetModuleStats(moduleKey, puantajResult.statRows, p, new Date());
      const statsForSelectedRange = () =>
        computeSheetModuleStats(
          moduleKey,
          puantajResult.statRows,
          "monthly",
          new Date(),
          customRange,
        );

      return jsonResponse({
        ...base,
        stats: {
          daily: statsForPeriod("daily"),
          weekly: statsForPeriod("weekly"),
          monthly: statsForPeriod("monthly"),
          active: statsForSelectedRange(),
        },
        statsTruncated: puantajResult.dailyRowCount >= STATS_ROW_LIMIT,
      });
    }

    const filters: Array<Record<string, unknown>> = [];
    if (moduleUsesDateRangeFilter(moduleKey)) {
      const dateFilter = moduleRowDateFilter(from, to);
      if (dateFilter) filters.push(dateFilter);
    }

    if (search) {
      const ids = await sheetRowIdsMatchingSearch(moduleKey, search);
      if (ids.length === 0) {
        if (statsOnly) {
          return jsonResponse({
            stats: emptySheetStats(period, moduleKey),
            statsTruncated: false,
          });
        }
        return jsonResponse({
          rows: [],
          total: 0,
          page,
          pageSize,
          ...(includeStats ? { stats: emptySheetStats(period, moduleKey) } : {}),
        });
      }
      filters.push({ id: { in: ids } });
    }

    const where = {
      moduleKey,
      ...(filters.length ? { AND: filters } : {}),
    };

    if (statsOnly) {
      const allForStats = await prisma.sheetDataRow.findMany({
        where,
        select: { recordDate: true, createdAt: true, personelName: true, rowData: true },
        take: STATS_ROW_LIMIT,
        orderBy: { recordDate: "desc" },
      });

      const statRows = allForStats.map((r) => ({
        recordDate: r.recordDate,
        createdAt: r.createdAt,
        personelName: r.personelName,
        rowData: r.rowData as Record<string, unknown>,
      }));

      const statsFn = (p: typeof period) => computeSheetModuleStats(moduleKey, statRows, p);

      return jsonResponse({
        stats: {
          daily: statsFn("daily"),
          weekly: statsFn("weekly"),
          monthly: statsFn("monthly"),
          active: statsFn(period),
        },
        statsTruncated: allForStats.length >= STATS_ROW_LIMIT,
      });
    }

    const [total, rows] = await Promise.all([
      prisma.sheetDataRow.count({ where }),
      prisma.sheetDataRow.findMany({
        where,
        include: { syncBatch: { select: { syncedAt: true } } },
        orderBy:
          sortBy === "personel"
            ? { personelName: sortDir }
            : [{ recordDate: sortDir }, { createdAt: sortDir }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const mappedRows = rows.map((r) => ({
      id: r.id,
      personelName: r.personelName,
      recordDate: r.recordDate,
      createdAt: r.createdAt,
      syncedAt: r.syncBatch.syncedAt,
      data: r.rowData,
    }));

    if (!includeStats) {
      return jsonResponse({
        rows: mappedRows,
        total,
        page,
        pageSize,
      });
    }

    const allForStats = await prisma.sheetDataRow.findMany({
      where,
      select: { recordDate: true, createdAt: true, personelName: true, rowData: true },
      take: STATS_ROW_LIMIT,
      orderBy: { recordDate: "desc" },
    });

    const statRows = allForStats.map((r) => ({
      recordDate: r.recordDate,
      createdAt: r.createdAt,
      personelName: r.personelName,
      rowData: r.rowData as Record<string, unknown>,
    }));

    const statsFn = (p: typeof period) => computeSheetModuleStats(moduleKey, statRows, p);

    return jsonResponse({
      rows: mappedRows,
      total,
      page,
      pageSize,
      stats: {
        daily: statsFn("daily"),
        weekly: statsFn("weekly"),
        monthly: statsFn("monthly"),
        active: statsFn(period),
      },
      statsTruncated: allForStats.length >= STATS_ROW_LIMIT,
    });
  }

  if (EXCEL_MODULE_KEYS.includes(moduleKey)) {
    const filters: Array<Record<string, unknown>> = [];
    const dateFilter = moduleRowDateFilter(from, to);
    if (dateFilter) filters.push(dateFilter);

    if (search) {
      const ids = await excelRowIdsMatchingSearch(moduleKey, search);
      if (ids.length === 0) {
        if (statsOnly) {
          return jsonResponse({
            stats: emptyExcelStats(period),
            statsTruncated: false,
          });
        }
        return jsonResponse({
          rows: [],
          total: 0,
          page,
          pageSize,
          ...(includeStats ? { stats: emptyExcelStats(period) } : {}),
        });
      }
      filters.push({ id: { in: ids } });
    }

    const where = {
      moduleKey,
      ...(filters.length ? { AND: filters } : {}),
    };

    const fixedConfig = fixedExcelConfig(moduleKey);

    if (fixedConfig && !statsOnly) {
      const [allRows, aliases] = await Promise.all([
        prisma.excelDataRow.findMany({
          where,
          include: { upload: { select: { uploadedAt: true, fileName: true } } },
          orderBy: [{ recordDate: "asc" }, { createdAt: "asc" }],
        }),
        loadPersonelAliases(moduleKey),
      ]);

      const grouped = new Map<
        string,
        {
          personelName: string;
          firstDate: Date | null;
          lastDate: Date | null;
          metrics: Record<string, number>;
          durations: Record<string, number>;
          fileNames: Set<string>;
          createdAt: Date;
        }
      >();

      for (const row of allRows) {
        const rawName = row.personelName?.trim() || "Belirtilmemiş";
        const personelName = resolvePersonelDisplayName(rawName, aliases) || rawName;
        const key = resolvePersonelBucketKey(rawName, aliases) || rawName.toLocaleLowerCase("tr-TR");
        const entry =
          grouped.get(key) ??
          {
            personelName,
            firstDate: row.recordDate,
            lastDate: row.recordDate,
            metrics: {},
            durations: {},
            fileNames: new Set<string>(),
            createdAt: row.createdAt,
          };
        const data = row.rowData as Record<string, unknown>;
        for (const metric of fixedConfig.metrics) {
          entry.metrics[metric] =
            (entry.metrics[metric] ?? 0) + parseDurationOrNumber(data[metric]);
        }
        for (const duration of fixedConfig.durations) {
          entry.durations[duration] =
            (entry.durations[duration] ?? 0) + parseDurationOrNumber(data[duration]);
        }
        if (row.recordDate) {
          if (!entry.firstDate || row.recordDate < entry.firstDate) entry.firstDate = row.recordDate;
          if (!entry.lastDate || row.recordDate > entry.lastDate) entry.lastDate = row.recordDate;
        }
        entry.fileNames.add(row.upload.fileName);
        if (row.createdAt < entry.createdAt) entry.createdAt = row.createdAt;
        grouped.set(key, entry);
      }

      const aggregateRows = [...grouped.values()].map((entry) => {
        const data: Record<string, string> = {
          "Personel Adı": entry.personelName,
          Tarih:
            from || to
              ? formatRangeLabel(from, to)
              : formatRangeLabel(entry.firstDate, entry.lastDate),
        };
        for (const metric of fixedConfig.metrics) {
          data[metric] = String(entry.metrics[metric] ?? 0);
        }
        for (const duration of fixedConfig.durations) {
          data[duration] = formatSeconds(entry.durations[duration] ?? 0);
        }
        return {
          id: `aggregate-${moduleKey}-${entry.personelName}`,
          personelName: entry.personelName,
          recordDate: entry.firstDate,
          createdAt: entry.createdAt,
          uploadedAt: entry.createdAt,
          fileName: [...entry.fileNames].join(", "),
          data,
        };
      });

      aggregateRows.sort((a, b) => {
        if (sortBy === "personel" || sortBy === "date") {
          const cmp =
            sortBy === "date"
              ? (a.recordDate?.getTime() ?? 0) - (b.recordDate?.getTime() ?? 0)
              : a.personelName.localeCompare(b.personelName, "tr");
          return sortDir === "asc" ? cmp : -cmp;
        }
        const av = parseDurationOrNumber(a.data[sortBy]);
        const bv = parseDurationOrNumber(b.data[sortBy]);
        return sortDir === "asc" ? av - bv : bv - av;
      });

      const total = aggregateRows.length;
      const pagedRows = aggregateRows.slice((page - 1) * pageSize, page * pageSize);

      if (!includeStats) {
        return jsonResponse({ rows: pagedRows, total, page, pageSize });
      }

      const statRows = allRows.map((r) => ({
        recordDate: r.recordDate,
        createdAt: r.createdAt,
        personelName: r.personelName,
        rowData: r.rowData as Record<string, unknown>,
      }));
      const statsFn = (p: typeof period) => computeModuleStats(statRows, p);

      return jsonResponse({
        rows: pagedRows,
        total,
        page,
        pageSize,
        stats: {
          daily: statsFn("daily"),
          weekly: statsFn("weekly"),
          monthly: statsFn("monthly"),
          active: statsFn(period),
        },
        statsTruncated: false,
      });
    }

    if (statsOnly) {
      const allForStats = await prisma.excelDataRow.findMany({
        where,
        select: { recordDate: true, createdAt: true, personelName: true, rowData: true },
        take: STATS_ROW_LIMIT,
        orderBy: { recordDate: "desc" },
      });

      const statRows = allForStats.map((r) => ({
        recordDate: r.recordDate,
        createdAt: r.createdAt,
        personelName: r.personelName,
        rowData: r.rowData as Record<string, unknown>,
      }));

      const statsFn = (p: typeof period) => computeModuleStats(statRows, p);

      return jsonResponse({
        stats: {
          daily: statsFn("daily"),
          weekly: statsFn("weekly"),
          monthly: statsFn("monthly"),
          active: statsFn(period),
        },
        statsTruncated: allForStats.length >= STATS_ROW_LIMIT,
      });
    }

    const [total, rows] = await Promise.all([
      prisma.excelDataRow.count({ where }),
      prisma.excelDataRow.findMany({
        where,
        include: { upload: { select: { uploadedAt: true, fileName: true } } },
        orderBy:
          sortBy === "personel"
            ? { personelName: sortDir }
            : [{ recordDate: sortDir }, { createdAt: sortDir }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const mappedRows = rows.map((r) => ({
      id: r.id,
      personelName: r.personelName,
      recordDate: r.recordDate,
      createdAt: r.createdAt,
      uploadedAt: r.upload.uploadedAt,
      fileName: r.upload.fileName,
      data: r.rowData,
    }));

    if (!includeStats) {
      return jsonResponse({
        rows: mappedRows,
        total,
        page,
        pageSize,
      });
    }

    const allForStats = await prisma.excelDataRow.findMany({
      where,
      select: { recordDate: true, createdAt: true, personelName: true, rowData: true },
      take: STATS_ROW_LIMIT,
      orderBy: { recordDate: "desc" },
    });

    const statRows = allForStats.map((r) => ({
      recordDate: r.recordDate,
      createdAt: r.createdAt,
      personelName: r.personelName,
      rowData: r.rowData as Record<string, unknown>,
    }));

    const statsFn = (p: typeof period) => computeModuleStats(statRows, p);

    return jsonResponse({
      rows: mappedRows,
      total,
      page,
      pageSize,
      stats: {
        daily: statsFn("daily"),
        weekly: statsFn("weekly"),
        monthly: statsFn("monthly"),
        active: statsFn(period),
      },
      statsTruncated: allForStats.length >= STATS_ROW_LIMIT,
    });
  }

  return NextResponse.json({ error: "Geçersiz modül" }, { status: 400 });
}

function emptySheetStats(period: ReturnType<typeof parsePeriod>, moduleKey: ModuleKey) {
  const empty = computeSheetModuleStats(moduleKey, [], period);
  return {
    daily: computeSheetModuleStats(moduleKey, [], "daily"),
    weekly: computeSheetModuleStats(moduleKey, [], "weekly"),
    monthly: computeSheetModuleStats(moduleKey, [], "monthly"),
    active: empty,
  };
}

function emptyExcelStats(period: ReturnType<typeof parsePeriod>) {
  return {
    daily: computeModuleStats([], "daily"),
    weekly: computeModuleStats([], "weekly"),
    monthly: computeModuleStats([], "monthly"),
    active: computeModuleStats([], period),
  };
}
