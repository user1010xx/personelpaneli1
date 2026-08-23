"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  dateRangeFilterPatch,
  dateRangePeriodLabel,
  resolveDateRangeFromFilters,
  type DateRangePreset,
} from "@/lib/date-range-filter";
import { emptyDashboardTotals } from "@/lib/dashboard";
import { TableSortIcon } from "@/components/ui/sortable-th";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";

type Person = {
  personelName: string;
  dinlenenCagriAdedi: number;
  ortalamaPuan: number;
  insiyatifAdedi: number;
  geribildirimAdedi: number;
  egitimAdedi: number;
  ornekCagriAdedi: number;
  motivasyonAdedi: number;
  bilgiDuellosuDogruAdedi: number;
  bilgiDuellosuYanlisAdedi: number;
};

type LeaderEntry = {
  personelName: string;
  display: string;
};

type Leaders = {
  dinlenen: LeaderEntry[];
  ortalamaPuan: LeaderEntry[];
  insiyatif: LeaderEntry[];
  geribildirim: LeaderEntry[];
  egitim: LeaderEntry[];
  ornekCagri: LeaderEntry[];
  motivasyon: LeaderEntry[];
  bilgiDuellosuDogru: LeaderEntry[];
  bilgiDuellosuYanlis: LeaderEntry[];
};

type SortKey = keyof Person;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "personelName", label: "Personel" },
  { key: "dinlenenCagriAdedi", label: "Dinlenen Çağrı" },
  { key: "ortalamaPuan", label: "Ortalama Puan" },
  { key: "insiyatifAdedi", label: "İnsiyatif" },
  { key: "geribildirimAdedi", label: "Geribildirim" },
  { key: "egitimAdedi", label: "Eğitim" },
  { key: "ornekCagriAdedi", label: "Örnek Çağrı" },
  { key: "motivasyonAdedi", label: "Motivasyon" },
  { key: "bilgiDuellosuDogruAdedi", label: "Bilgi Doğru" },
  { key: "bilgiDuellosuYanlisAdedi", label: "Bilgi Yanlış" },
];

type DashboardApiResponse = {
  rows: Person[];
  totals?: ReturnType<typeof emptyDashboardTotals>;
  leaders: Leaders;
  from?: string;
  to?: string;
  truncated?: boolean;
};

export function DashboardView() {
  const [filters, setFilters] = usePersistedPageState("dashboard", {
    datePreset: "today" as DateRangePreset,
    customFrom: "",
    customTo: "",
    search: "",
    sortKey: "personelName" as SortKey,
    sortDir: "asc" as SortDir,
  });
  const [searchInput, setSearchInput] = useState(filters.search);
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const range = useMemo(
    () =>
      resolveDateRangeFromFilters({
        datePreset: filters.datePreset,
        customFrom: filters.customFrom,
        customTo: filters.customTo,
      }),
    [filters.datePreset, filters.customFrom, filters.customTo],
  );
  const effectiveFrom = range.from;
  const effectiveTo = range.to;
  const effectivePeriodLabel = dateRangePeriodLabel(range);

  const params = useMemo(() => {
    const p = new URLSearchParams({ from: effectiveFrom, to: effectiveTo });
    if (filters.search) p.set("search", filters.search);
    return p;
  }, [effectiveFrom, effectiveTo, filters.search]);

  const { data, showSkeleton, refreshing, error, reload } = usePanelFetch<DashboardApiResponse>(
    "/api/dashboard",
    params,
    { debounceMs: 0 },
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const totals = data?.totals ?? emptyDashboardTotals();
  const { search, sortKey, sortDir } = filters;

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv, "tr") : bv.localeCompare(av, "tr");
      }
      const na = Number(av);
      const nb = Number(bv);
      return sortDir === "asc" ? na - nb : nb - na;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      patchFilters({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      patchFilters({ sortKey: key, sortDir: key === "personelName" ? "asc" : "desc" });
    }
  }

  function applySearch() {
    patchFilters({ search: searchInput.trim() });
  }

  function exportExcel() {
    const next = new URLSearchParams({ from: effectiveFrom, to: effectiveTo });
    if (search) next.set("search", search);
    window.open(`/api/dashboard/export?${next}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Genel"
        title="Dashboard"
        description="Personel bazında dinlenen çağrı, puan, insiyatif, eğitim, geribildirim ve bilgi duellosu özeti."
      />

      <section className="panel-card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">
              Dönem seçimi
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Şu an: <span className="font-semibold text-brand-800">{effectivePeriodLabel}</span>
            </p>
          </div>
          <DateRangePicker
            value={range}
            onChange={(next) => patchFilters(dateRangeFilterPatch(next))}
            onRefresh={() => void reload({ silent: true, force: true })}
            refreshing={refreshing}
            align="end"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="filter-label">Ara</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Personel ara"
                className="panel-input pl-10"
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applySearch}>
              Uygula
            </Button>
            <Button type="button" variant="secondary" onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>
      ) : null}

      <RefreshingHint show={refreshing && rows.length > 0} />

      {data?.truncated ? (
        <p className="text-xs font-medium text-amber-700">
          Özet kayıt üst sınırı nedeniyle eksik hesaplanmış olabilir. Tarih aralığını daraltmayı
          deneyin.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Dinlenen çağrı"
          value={totals.dinlenenCagriAdedi}
          hint={`${totals.personelAdedi} personel`}
          tone="blue"
        />
        <MetricCard
          label="Ortalama puan"
          value={totals.ortalamaPuan.toFixed(1)}
          hint="Tüm dinlemeler"
          tone="violet"
        />
        <MetricCard
          label="İnsiyatif çalışma"
          value={totals.insiyatifAdedi}
          hint="Kayıt adedi"
          tone="amber"
        />
        <MetricCard
          label="Geribildirim"
          value={totals.geribildirimAdedi}
          hint="İletilen adet"
          tone="rose"
        />
        <MetricCard
          label="Eğitim"
          value={totals.egitimAdedi}
          hint="Alınan eğitim"
          tone="emerald"
        />
        <MetricCard
          label="Örnek çağrı"
          value={totals.ornekCagriAdedi}
          hint="İletilen adet"
          tone="slate"
        />
        <MetricCard
          label="Motivasyon"
          value={totals.motivasyonAdedi}
          hint="İletilen adet"
          tone="emerald"
        />
        <MetricCard
          label="Bilgi duellosu doğru"
          value={totals.bilgiDuellosuDogruAdedi}
          hint="Doğru yanıt"
          tone="emerald"
        />
        <MetricCard
          label="Bilgi duellosu yanlış"
          value={totals.bilgiDuellosuYanlisAdedi}
          hint="Hatalı yanıt"
          tone="rose"
        />
      </section>

      <section className="data-table-wrap">
        <div className="panel-card-header">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">
            Personel tablosu
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      {col.label}
                      <TableSortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Seçilen aralıkta veri yok.
                  </td>
                </tr>
              ) : (
                sortedRows.map((person) => (
                  <tr key={person.personelName}>
                    <td className="!font-semibold !text-slate-900">{person.personelName}</td>
                    <td className="tabular-nums">{person.dinlenenCagriAdedi}</td>
                    <td className="tabular-nums">{person.ortalamaPuan.toFixed(1)}</td>
                    <td className="tabular-nums">{person.insiyatifAdedi}</td>
                    <td className="tabular-nums">{person.geribildirimAdedi}</td>
                    <td className="tabular-nums">{person.egitimAdedi}</td>
                    <td className="tabular-nums">{person.ornekCagriAdedi}</td>
                    <td className="tabular-nums">{person.motivasyonAdedi}</td>
                    <td className="tabular-nums">{person.bilgiDuellosuDogruAdedi}</td>
                    <td className="tabular-nums">{person.bilgiDuellosuYanlisAdedi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
