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
import { parseDurationOrNumber } from "@/lib/duration-parse";
import {
  loadPersonelAliases,
  resolvePersonelBucketKey,
  resolvePersonelDisplayName,
} from "@/lib/personel-alias";

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

function fixedExcelConfig(moduleKey: string) {
  return FIXED_EXCEL_MODULES[moduleKey as keyof typeof FIXED_EXCEL_MODULES];
}

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
      const fixedConfig = fixedExcelConfig(moduleKey);
      const [rows, aliases] = await Promise.all([
        prisma.excelDataRow.findMany({
          where: {
            moduleKey,
            ...(filters.length ? { AND: filters } : {}),
          },
          orderBy: [{ recordDate: fixedConfig ? "asc" : "desc" }, { createdAt: fixedConfig ? "asc" : "desc" }],
          ...(fixedConfig ? {} : { take: EXPORT_ROW_LIMIT }),
        }),
        fixedConfig ? loadPersonelAliases(moduleKey) : Promise.resolve(new Map<string, string>()),
      ]);

      if (fixedConfig) {
        const grouped = new Map<
          string,
          {
            personelName: string;
            firstDate: Date | null;
            lastDate: Date | null;
            metrics: Record<string, number>;
            durations: Record<string, number>;
          }
        >();

        for (const row of rows) {
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
          grouped.set(key, entry);
        }

        exportRows = [...grouped.values()].map((entry) => {
          const data: Record<string, unknown> = {
            "Personel Adı": entry.personelName,
            Tarih:
              from || to
                ? formatRangeLabel(from, to)
                : formatRangeLabel(entry.firstDate, entry.lastDate),
          };
          for (const metric of fixedConfig.metrics) {
            data[metric] = entry.metrics[metric] ?? 0;
          }
          for (const duration of fixedConfig.durations) {
            data[duration] = formatSeconds(entry.durations[duration] ?? 0);
          }
          return data;
        });
      } else {
        exportRows = rows.map((r) => ({
          ...(r.rowData as Record<string, unknown>),
          personel: r.personelName,
          tarih: r.recordDate?.toISOString().slice(0, 10) ?? "",
        }));
      }
    }
  } else {
    return NextResponse.json({ error: "Geçersiz modül" }, { status: 400 });
  }

  const buffer = await rowsToWorkbook(exportRows, moduleKey);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${moduleKey.toLowerCase()}-${Date.now()}.xlsx"`,
    },
  });
}
