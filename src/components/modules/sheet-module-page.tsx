"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { ModuleKey } from "@prisma/client";
import type { Period } from "@/lib/date-ranges";
import {
  displayColumnsForModule,
  getPersonelFieldValue,
  PERSONEL_COLUMN_LABELS,
  type PersonelColumnLabel,
} from "@/lib/sheet-parsers";
import type { SheetModuleStats } from "@/lib/sheet-stats";
import { useModuleData } from "@/hooks/use-module-data";
import { invalidateModuleDataCaches } from "@/lib/panel-cache";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { useMonthYearRange } from "@/hooks/use-month-year-range";
import { currentMonthYear } from "@/lib/month-year";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataFilters } from "@/components/modules/data-filters";
import { PeriodStatsBar } from "@/components/modules/period-stats";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { nextSortDir } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type DataRow = {
  id: string;
  personelName: string | null;
  recordDate: string | null;
  createdAt: string;
  syncedAt?: string;
  data: Record<string, string>;
};

type Props = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  sheetsConfigured?: boolean;
  canManage?: boolean;
};

export function SheetModulePage({
  moduleKey,
  title,
  description,
  sheetsConfigured = true,
  canManage = false,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isPuantaj = moduleKey === "PUANTAJ";
  const isWhatsapp = moduleKey === "WHATSAPP";
  const isPersonel = moduleKey === "PERSONEL";
  const isUyariKesinti = moduleKey === "UYARI_KESINTI";
  const showDateColumn =
    moduleKey !== "WHATSAPP" && moduleKey !== "PERSONEL" && !isPuantaj && !isUyariKesinti;
  const defaultPeriod = currentMonthYear();
  const [filters, setFilters] = usePersistedPageState(`sheet-${moduleKey}`, {
    period: (isPuantaj || isWhatsapp || isUyariKesinti ? "monthly" : "daily") as Period,
    search: "",
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    sortBy: isPuantaj || isPersonel ? "personel" : isUyariKesinti ? "sheet" : "date",
    sortDir: (isUyariKesinti || isWhatsapp ? "asc" : "desc") as "asc" | "desc",
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
  const clientSort = useClientTableSort<string>("personel", "asc");

  const handleColumnSort = (key: string) => {
    const apiKeys = isPuantaj
      ? new Set(["personel", "mesai", "izin"])
      : isPersonel
        ? new Set(["personel"])
        : isUyariKesinti
          ? new Set(["personel"])
          : new Set(["date", "personel"].filter((k) => k !== "date" || showDateColumn));

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
    const effectiveSortBy = isPersonel && sortBy === "date" ? "personel" : sortBy;
    const p = new URLSearchParams({
      search,
      sortBy: effectiveSortBy,
      sortDir,
      period,
      page: String(page),
      pageSize: "50",
    });
    if (!isPersonel && !isUyariKesinti) {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    return p;
  }, [search, from, to, sortBy, sortDir, period, page, isPersonel, isUyariKesinti]);

  const { rows, total, stats, statsTruncated, loading, refreshing, error } =
    useModuleData(`/api/data/${moduleKey}`, params);

  const typedRows = rows as DataRow[];
  const displayRows = useMemo(() => {
    if (!clientSortCol) return typedRows;
    return clientSort.sort(typedRows, (row, key) => {
      if (key === "personel" || key === "Personel Adı") {
        return getPersonelFieldValue(row, "Personel Adı");
      }
      if (key === "date") return row.recordDate ?? row.createdAt;
      if (key === "mesai") return row.data?.["Total Mesai"];
      if (key === "izin") return row.data?.["Total İzin"];
      if (isPersonel && PERSONEL_COLUMN_LABELS.includes(key as PersonelColumnLabel)) {
        return getPersonelFieldValue(row, key as PersonelColumnLabel);
      }
      return row.data?.[key] ?? "";
    });
  }, [typedRows, clientSortCol, clientSort, isPersonel]);

  const columnToSortKey = (col: string) => {
    if (isPuantaj && col === "Total Mesai") return "mesai";
    if (isPuantaj && col === "Total İzin") return "izin";
    if (isPersonel && col === "Personel Adı") return "personel";
    return col;
  };
  const activeStats = stats?.active as SheetModuleStats | undefined;

  const columns = useMemo(
    () => displayColumnsForModule(moduleKey, typedRows),
    [moduleKey, typedRows],
  );

  const puantajSortOptions = [
    { value: "personel", label: "Personele göre" },
    { value: "mesai", label: "Total mesai" },
    { value: "izin", label: "Total izin" },
  ];
  const fullWidthCells = moduleKey === "PERSONEL";

  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    const res = await fetch("/api/sheets/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey }),
    });
    const json = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setMessage(json.error ?? "Güncelleme başarısız");
      return;
    }
    const tab = json.sheetTab ? ` (sekme: ${json.sheetTab})` : "";
    setMessage(`${json.rowCount} satır senkronize edildi${tab}.`);
    invalidateModuleDataCaches(moduleKey);
  }

  function exportExcel() {
    const p = new URLSearchParams({ search, sortBy, sortDir });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    window.open(`/api/data/${moduleKey}/export?${p}`, "_blank");
  }

  const showSkeleton = loading && typedRows.length === 0;
  const colSpan = columns.length + (showDateColumn ? 1 : 0) + (isPersonel ? 0 : 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`${description} · ${periodLabel}`}
        actions={
          <>
            {canManage ? (
              <Button onClick={syncNow} disabled={syncing || !sheetsConfigured}>
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                Google Sheets Güncelle
              </Button>
            ) : null}
            <Button variant="secondary" onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Excel İndir
            </Button>
          </>
        }
      />

      <RefreshingHint show={refreshing && !showSkeleton} />

      {!sheetsConfigured ? (
        <Alert>
          Google Service Account bilgileri eksik. .env dosyasına GOOGLE_SERVICE_ACCOUNT_EMAIL ve
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ekleyip sunucuyu yeniden başlatın.
        </Alert>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert>{message}</Alert> : null}
      {statsTruncated ? (
        <p className="text-xs text-amber-700">
          İstatistikler çok kayıt nedeniyle örneklem üzerinden hesaplandı (üst sınır).
        </p>
      ) : null}

      {!isPuantaj ? (
        <PeriodStatsBar
          stats={stats}
          activePeriod={period}
          onPeriodChange={(p) => patchFilters({ period: p })}
          variant={isPersonel ? "personel" : "default"}
        />
      ) : null}

      {isPuantaj && activeStats?.puantajOzet?.length ? (
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium">
            Dönem:{" "}
            {new Date(from).toLocaleDateString("tr-TR")} –{" "}
            {new Date(to).toLocaleDateString("tr-TR")}
          </span>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-900">
            Toplam mesai:{" "}
            {activeStats.puantajOzet
              .reduce((s, p) => s + p.mesaiGun, 0)
              .toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
            {" gün"}
          </span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-900">
            Toplam izin:{" "}
            {activeStats.puantajOzet
              .reduce((s, p) => s + p.izinGun, 0)
              .toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
            {" gün"}
          </span>
        </div>
      ) : null}

      {moduleKey === "UYARI_KESINTI" && activeStats ? (
        <div className="flex flex-wrap gap-3">
          <span className="badge-warning">Uyarı: {activeStats.uyariSayisi ?? 0}</span>
          <span className="badge-danger">Kesinti: {activeStats.kesintiSayisi ?? 0}</span>
        </div>
      ) : null}

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
        sortOptions={
          isPuantaj
            ? puantajSortOptions
            : isPersonel
              ? [{ value: "personel", label: "Personele göre" }]
              : isUyariKesinti
                ? [{ value: "sheet", label: "Sheet sırasına göre" }]
              : undefined
        }
        hideDateRange={isPersonel || isUyariKesinti}
      />

      <div className="data-table-wrap">
        <div className="panel-card-header">
          <h2 className="text-sm font-bold text-slate-900">
            {isPuantaj ? "Puantaj özeti" : "Kayıt listesi"}
          </h2>
          <p className="text-xs text-slate-500">
            {isPuantaj
              ? "Günlük kayıtlar Google Sheets'te tutulur; burada seçilen dönemin personel toplamları gösterilir."
              : isWhatsapp
                ? "Seçilen ay/yıl döneminin personel özetleri listelenir; eski aylar korunur."
                : isPersonel
                  ? "Tüm personel listelenir; işe giriş tarihi yalnızca bilgi sütunudur."
                  : isUyariKesinti
                    ? "Google Sheets'teki güncel kayıtlar sheet sırasıyla listelenir; tarih yalnızca bilgi sütunudur."
                  : "Filtrelere göre güncellenir"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {showDateColumn ? (
                  <SortableTh
                    label="Tarih"
                    sortKey="date"
                    activeKey={headerSortKey}
                    dir={headerSortDir}
                    onSort={handleColumnSort}
                  />
                ) : null}
                {!isPersonel ? (
                  <SortableTh
                    label="Personel"
                    sortKey="personel"
                    activeKey={headerSortKey}
                    dir={headerSortDir}
                    onSort={handleColumnSort}
                  />
                ) : null}
                {columns.map((col) => (
                  <SortableTh
                    key={col}
                    label={col}
                    sortKey={columnToSortKey(col)}
                    activeKey={headerSortKey}
                    dir={headerSortDir}
                    onSort={handleColumnSort}
                    className="tabular-nums"
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={colSpan} className="!py-4">
                      <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan}>
                    <div className="empty-state">
                      <p className="text-sm font-medium text-slate-600">Kayıt bulunamadı</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Google Sheets bağlantısını tanımlayıp güncelleyin.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => (
                  <tr key={row.id}>
                    {showDateColumn ? (
                      <td className="whitespace-nowrap font-medium tabular-nums text-slate-500">
                        {row.recordDate
                          ? new Date(row.recordDate).toLocaleDateString("tr-TR")
                          : row.data?.Tarih ?? "-"}
                      </td>
                    ) : null}
                    {!isPersonel ? (
                      <td className="!font-semibold !text-slate-900">
                        {row.personelName ?? row.data?.["Personel Adı"] ?? "-"}
                      </td>
                    ) : null}
                    {columns.map((col) => {
                      const value = isPersonel
                        ? getPersonelFieldValue(row, col as PersonelColumnLabel)
                        : (row.data?.[col] ?? "");
                      const isNameCol = isPersonel && col === "Personel Adı";
                      return (
                        <td
                          key={col}
                          className={cn(
                            isNameCol && "!font-semibold !text-slate-900",
                            fullWidthCells
                              ? "whitespace-normal break-words"
                              : "max-w-[280px] truncate",
                          )}
                        >
                          <CellValue moduleKey={moduleKey} col={col} value={value} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card flex items-center justify-between px-5 py-4 text-sm text-slate-600">
        <p className="font-medium">
          Toplam {total} {isPuantaj ? "personel" : "kayıt"} · Sayfa {page}
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

function CellValue({
  moduleKey,
  col,
  value,
}: {
  moduleKey: ModuleKey;
  col: string;
  value: string;
}) {
  if (moduleKey === "PUANTAJ" && (col === "Total Mesai" || col === "Total İzin")) {
    const num = Number(value.replace(",", "."));
    if (Number.isFinite(num)) {
      return (
        <span className="tabular-nums font-medium text-slate-800">
          {num.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
        </span>
      );
    }
  }
  if (moduleKey === "UYARI_KESINTI" && col === "Kayıt Türü") {
    const isKesinti = value.toLowerCase().includes("kesinti");
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
          isKesinti
            ? "bg-rose-100 text-rose-800"
            : "bg-amber-100 text-amber-900",
        )}
      >
        {value || "Uyarı"}
      </span>
    );
  }
  return value;
}

function Alert({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        variant === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-brand-200 bg-brand-50 text-brand-800",
      )}
    >
      {children}
    </div>
  );
}
