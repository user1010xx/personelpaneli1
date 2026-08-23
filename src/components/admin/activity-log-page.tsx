"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatLogTimestamp, roleLabel } from "@/lib/activity-log";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { SortableTh } from "@/components/ui/sortable-th";
import { nextSortDir } from "@/lib/table-sort";
import type { SortDir } from "@/lib/table-sort";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { resolveDateRange, type DateRangeValue } from "@/lib/date-range-filter";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  userName: string;
  userEmail: string;
  userRole: "ADMIN" | "USER";
  description: string;
  createdAt: string;
};

type LogResponse = {
  rows: LogRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [range, setRange] = useState<DateRangeValue>(() => resolveDateRange("today"));

  const params = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      pageSize: "50",
      sortBy,
      sortDir,
      from: range.from,
      to: range.to,
    });
    if (search.trim()) p.set("search", search.trim());
    return p;
  }, [page, range.from, range.to, search, sortBy, sortDir]);

  const handleSort = (key: string) => {
    setSortDir((dir) => nextSortDir(sortBy, key, dir));
    setSortBy(key);
    setPage(1);
  };

  const { data, refreshing, error, showSkeleton, reload } = usePanelFetch<LogResponse>(
    "/api/activity-logs",
    params,
    { refetchOnPanelUpdate: false },
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sistem"
        title="LOG"
        description="Tüm admin ve kullanıcı işlemleri — kim, ne zaman, ne yaptı."
        toolbar={
          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
            onRefresh={() => void reload({ silent: true, force: true })}
            refreshing={refreshing}
          />
        }
      />

      <div className="filter-toolbar lg:items-center">
        <div className="filter-field min-w-[240px] flex-[2]">
          <span className="filter-label">Arama</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Kişi, e-posta veya işlem açıklaması…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch("");
            setRange(resolveDateRange("today"));
            setPage(1);
          }}
        >
          Filtreleri temizle
        </Button>
      </div>

      {refreshing && !showSkeleton ? (
        <p className="text-xs font-medium text-brand-600">Loglar güncelleniyor…</p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="data-table-wrap">
        <div className="panel-card-header">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">
            İşlem geçmişi
          </h2>
          <p className="text-xs text-slate-500">En yeni kayıtlar üstte</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh
                  label="Tarih / Saat"
                  sortKey="createdAt"
                  activeKey={sortBy}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Kim"
                  sortKey="userName"
                  activeKey={sortBy}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Rol"
                  sortKey="userRole"
                  activeKey={sortBy}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Ne yaptı"
                  sortKey="description"
                  activeKey={sortBy}
                  dir={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="!py-4">
                      <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state py-10 text-sm text-slate-500">
                      Henüz kayıtlı işlem yok.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap tabular-nums text-slate-600">
                      {formatLogTimestamp(row.createdAt)}
                    </td>
                    <td>
                      <p className="font-semibold text-slate-900">{row.userName}</p>
                      <p className="text-xs text-slate-500">{row.userEmail}</p>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
                          row.userRole === "ADMIN"
                            ? "bg-brand-100 text-brand-800"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {roleLabel(row.userRole)}
                      </span>
                    </td>
                    <td className="whitespace-normal text-slate-800">{row.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card flex items-center justify-between px-5 py-4 text-sm text-slate-600">
        <p className="font-medium">
          Toplam {total} kayıt · Sayfa {page}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Önceki
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
