"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import type { ModuleKey } from "@prisma/client";
import type { Period } from "@/lib/date-ranges";
import { useModuleData } from "@/hooks/use-module-data";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { useMonthYearRange } from "@/hooks/use-month-year-range";
import { currentMonthYear } from "@/lib/month-year";
import { invalidateModuleDataCaches } from "@/lib/panel-cache";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { nextSortDir } from "@/lib/table-sort";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataFilters } from "@/components/modules/data-filters";
import { PeriodStatsBar } from "@/components/modules/period-stats";
import { ExcelUploadDialog } from "@/components/modules/excel-upload-dialog";
import { monthYearToIsoRange } from "@/lib/month-year";

type DataRow = {
  id: string;
  personelName: string | null;
  recordDate: string | null;
  createdAt: string;
  fileName?: string;
  data: Record<string, string>;
};

type Props = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  canManage?: boolean;
};

const DISPLAY_COLUMNS: Partial<Record<ModuleKey, string[]>> = {
  UYE_ADEDI: ["Personel Adı", "Üye Adedi", "İlk Yat Adedi", "Tarih"],
  CAGRI_SURECI: ["Personel Adı", "Arama Adedi", "Konuşma Süresi", "Tarih"],
};

export function ExcelModulePage({ moduleKey, title, description, canManage = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const defaultPeriod = currentMonthYear();
  const [filters, setFilters] = usePersistedPageState(`excel-${moduleKey}`, {
    period: "daily" as Period,
    search: "",
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    sortBy: "date",
    sortDir: "desc" as "asc" | "desc",
    page: 1,
  });
  const { period, search, sortBy, sortDir, page } = filters;
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const { month, year, from, to, periodLabel, setMonthYear } = useMonthYearRange(
    filters,
    patchFilters,
  );
  const [clientSortCol, setClientSortCol] = useState<string | null>(null);
  const clientSort = useClientTableSort<string>("date", "desc");

  const handleColumnSort = (key: string) => {
    const apiKeys = new Set(["date", "personel"]);
    if (apiKeys.has(key)) {
      setClientSortCol(null);
      patchFilters({
        sortBy: key,
        sortDir: nextSortDir(sortBy, key, sortDir),
        page: 1,
      });
      return;
    }
    setClientSortCol(key);
    clientSort.toggleSort(key);
  };

  const headerSortKey = clientSortCol ?? sortBy;
  const headerSortDir = clientSortCol ? clientSort.sortDir : sortDir;

  const params = useMemo(() => {
    const p = new URLSearchParams({
      search,
      sortBy,
      sortDir,
      period,
      page: String(page),
      pageSize: "50",
    });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [search, from, to, sortBy, sortDir, period, page]);

  const { rows, total, stats, loading, refreshing } = useModuleData(
    `/api/data/${moduleKey}`,
    params,
  );

  const typedRows = rows as DataRow[];
  const displayRows = useMemo(() => {
    if (!clientSortCol) return typedRows;
    return clientSort.sort(typedRows, (row, key) => {
      if (key === "date") return row.recordDate ?? row.createdAt;
      if (key === "personel") return row.personelName ?? "";
      if (key === "fileName") return row.fileName ?? "";
      if (key === "Tarih") return row.recordDate ?? row.data?.Tarih ?? row.createdAt;
      return row.data?.[key] ?? "";
    });
  }, [typedRows, clientSortCol, clientSort]);

  function onFilePicked(file: File) {
    setPendingFile(file);
    setUploadDialogOpen(true);
  }

  async function uploadFile(file: File, periodFrom: string, periodTo: string) {
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    form.append("from", periodFrom);
    form.append("to", periodTo);
    const res = await fetch(`/api/excel/${moduleKey}/upload`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const json = await res.json();
    setUploading(false);
    setUploadDialogOpen(false);
    setPendingFile(null);
    if (!res.ok) {
      setMessage(json.error ?? "Yükleme başarısız");
      return;
    }
    const range =
      periodFrom === periodTo
        ? new Date(periodFrom).toLocaleDateString("tr-TR")
        : `${new Date(periodFrom).toLocaleDateString("tr-TR")} – ${new Date(periodTo).toLocaleDateString("tr-TR")}`;
    setMessage(`${json.rowCount} satır yüklendi (${range}).`);
    setMonthYear(
      new Date(periodFrom).getMonth() + 1,
      new Date(periodFrom).getFullYear(),
    );
    invalidateModuleDataCaches(moduleKey);
  }

  const uploadDefaults = monthYearToIsoRange(month, year);

  function exportExcel() {
    const p = new URLSearchParams({ search, sortBy, sortDir });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    window.open(`/api/data/${moduleKey}/export?${p}`, "_blank");
  }

  const fixedColumns = DISPLAY_COLUMNS[moduleKey];
  const columns = fixedColumns
    ?? (typedRows.length
      ? Array.from(new Set(typedRows.flatMap((row) => Object.keys(row.data ?? {})))).slice(0, 12)
      : []);

  const showSkeleton = loading && typedRows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`${description} · ${periodLabel}`}
        actions={
          <>
            {canManage ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xlsm,.xls,.xlsb"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFilePicked(file);
                    e.target.value = "";
                  }}
                />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
                  Excel Yükle
                </Button>
              </>
            ) : null}
            <Button variant="secondary" onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Excel İndir
            </Button>
          </>
        }
      />

      {refreshing && !showSkeleton ? (
        <p className="text-xs font-medium text-brand-600">Veriler güncelleniyor…</p>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          {message}
        </div>
      ) : null}

      <PeriodStatsBar stats={stats} activePeriod={period} onPeriodChange={(p) => patchFilters({ period: p })} />
      <DataFilters
        search={search}
        onSearchChange={(v) => patchFilters({ search: v, page: 1 })}
        month={month}
        year={year}
        onMonthYearChange={(m, y) => {
          setMonthYear(m, y);
          patchFilters({ page: 1 });
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortByChange={(v) => patchFilters({ sortBy: v, page: 1 })}
        onSortDirChange={(v) => patchFilters({ sortDir: v, page: 1 })}
      />

      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {!fixedColumns ? (
                  <>
                    <SortableTh
                      label="Tarih"
                      sortKey="date"
                      activeKey={headerSortKey}
                      dir={headerSortDir}
                      onSort={handleColumnSort}
                      className="px-5 py-3.5"
                    />
                    <SortableTh
                      label="Personel"
                      sortKey="personel"
                      activeKey={headerSortKey}
                      dir={headerSortDir}
                      onSort={handleColumnSort}
                      className="px-5 py-3.5"
                    />
                    <SortableTh
                      label="Dosya"
                      sortKey="fileName"
                      activeKey={headerSortKey}
                      dir={headerSortDir}
                      onSort={handleColumnSort}
                      className="px-5 py-3.5"
                    />
                  </>
                ) : null}
                {columns.map((col) => (
                  <SortableTh
                    key={col}
                    label={col}
                    sortKey={col === "Personel Adı" ? "personel" : col === "Tarih" ? "date" : col}
                    activeKey={headerSortKey}
                    dir={headerSortDir}
                    onSort={handleColumnSort}
                    className="px-5 py-3.5"
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showSkeleton ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={columns.length + (fixedColumns ? 0 : 3)} className="px-5 py-3">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : displayRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (fixedColumns ? 0 : 3)}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Kayıt bulunamadı. Excel dosyası yükleyin.
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-brand-50/30">
                    {!fixedColumns ? (
                      <>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                          {row.recordDate
                            ? new Date(row.recordDate).toLocaleDateString("tr-TR")
                            : new Date(row.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {row.personelName ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{row.fileName ?? "-"}</td>
                      </>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={
                          col === "Personel Adı"
                            ? "px-5 py-3.5 font-semibold text-slate-900"
                            : "max-w-[220px] truncate px-5 py-3.5 text-slate-600"
                        }
                      >
                        {col === "Personel Adı"
                          ? row.personelName ?? row.data?.[col] ?? "-"
                          : col === "Tarih"
                            ? row.data?.Tarih
                              ?? (row.recordDate
                                ? new Date(row.recordDate).toLocaleDateString("tr-TR")
                                : new Date(row.createdAt).toLocaleDateString("tr-TR"))
                            : row.data?.[col] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExcelUploadDialog
        open={uploadDialogOpen}
        file={pendingFile}
        defaultFrom={uploadDefaults.from}
        defaultTo={uploadDefaults.to}
        uploading={uploading}
        onClose={() => {
          if (uploading) return;
          setUploadDialogOpen(false);
          setPendingFile(null);
        }}
        onConfirm={(periodFrom, periodTo) => {
          if (pendingFile) void uploadFile(pendingFile, periodFrom, periodTo);
        }}
      />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p className="font-medium">
          Toplam {total} kayıt · Sayfa {page}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => patchFilters({ page: page - 1 })}
          >
            Önceki
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page * 50 >= total}
            onClick={() => patchFilters({ page: page + 1 })}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
