"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useMonthYearRange } from "@/hooks/use-month-year-range";
import { currentMonthYear } from "@/lib/month-year";
import { formatDuration } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { TableSortIcon } from "@/components/ui/sortable-th";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { PageHeader } from "@/components/ui/page-header";

type Person = {
  personelName: string;
  uyeAdedi: number;
  ortalamaAramaAdedi: number;
  ortalamaKonusmaSuresi: number;
  ortalamaCagriPuani: number;
  ortalamaWhatsappCevapsiz: number;
};

type LeaderEntry = {
  personelName: string;
  display: string;
};

type Leaders = {
  uyelik: LeaderEntry[];
  cagriPuani: LeaderEntry[];
  konusmaSuresi: LeaderEntry[];
  aramaAdedi: LeaderEntry[];
  whatsappCevapsiz: LeaderEntry[];
};

type SortKey = keyof Person;
type SortDir = "asc" | "desc";

const LEADER_CARDS = [
  {
    key: "uyelik" as const,
    title: "Haftanın Üyelik Lideri",
    className: "from-emerald-500 to-emerald-600",
  },
  {
    key: "cagriPuani" as const,
    title: "Haftanın Çağrı Puanı Lideri",
    className: "from-sky-500 to-blue-600",
  },
  {
    key: "konusmaSuresi" as const,
    title: "Haftanın Konuşma Süresi Lideri",
    className: "from-violet-500 to-purple-600",
  },
  {
    key: "aramaAdedi" as const,
    title: "Haftanın Arama Adedi Lideri",
    className: "from-orange-500 to-amber-600",
  },
  {
    key: "whatsappCevapsiz" as const,
    title: "Haftanın WhatsApp Cevapsız Lideri",
    className: "from-rose-500 to-red-600",
  },
];

const COLUMNS: { key: SortKey; label: string; format?: (v: number) => string }[] = [
  { key: "personelName", label: "Personel Adı" },
  { key: "uyeAdedi", label: "Üye Adedi" },
  { key: "ortalamaAramaAdedi", label: "Ortalama Arama Adedi" },
  {
    key: "ortalamaKonusmaSuresi",
    label: "Ortalama Konuşma Süresi",
    format: (v) => formatDuration(v),
  },
  { key: "ortalamaCagriPuani", label: "Ortalama Çağrı Puanı" },
  { key: "ortalamaWhatsappCevapsiz", label: "Ortalama WhatsApp Cevapsız Adedi" },
];

type DashboardApiResponse = {
  rows: Person[];
  leaders: Leaders;
  from?: string;
  to?: string;
  truncated?: boolean;
};

export function DashboardView() {
  const defaultPeriod = currentMonthYear();
  const [filters, setFilters] = usePersistedPageState("dashboard", {
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    search: "",
    sortKey: "personelName" as SortKey,
    sortDir: "asc" as SortDir,
  });
  const [searchInput, setSearchInput] = useState(filters.search);
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const { month, year, from, to, periodLabel, setMonthYear } = useMonthYearRange(
    filters,
    patchFilters,
  );

  const params = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (filters.search) p.set("search", filters.search);
    return p;
  }, [filters.search, from, to]);

  const { data, showSkeleton, refreshing } = usePanelFetch<DashboardApiResponse>(
    "/api/dashboard",
    params,
    { debounceMs: 0 },
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const leaders = data?.leaders ?? null;
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
    const params = new URLSearchParams({ from, to });
    if (search) params.set("search", search);
    window.open(`/api/dashboard/export?${params}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Personel performansı, liderlik kartları ve birleşik operasyon metrikleri."
      />

      <section className="panel-card p-5 sm:p-6">
        <h2 className="mb-1 font-display text-lg font-bold text-slate-900">Dönem seçimi</h2>
        <p className="mb-5 text-xs text-slate-500">
          Dashboard metrikleri seçilen ay ve yıla göre hesaplanır — şu an:{" "}
          <span className="font-semibold text-brand-700">{periodLabel}</span>
        </p>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr_auto] lg:items-end">
          <MonthYearPicker
            month={month}
            year={year}
            onChange={(m, y) => setMonthYear(m, y)}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Ara</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Personel veya değer ara"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-brand-600 hover:to-brand-700"
            >
              Uygula
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {periodLabel} · Üye Adedi, Çağrı Süreci, Kalite ve
          WhatsApp modüllerinden birleştirilmiş veri
        </p>
      </section>

      <RefreshingHint show={refreshing && rows.length > 0} />

      {data?.truncated ? (
        <p className="text-xs font-medium text-amber-700">
          Özet kayıt üst sınırı nedeniyle eksik hesaplanmış olabilir. Tarih aralığını daraltmayı
          deneyin.
        </p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-5">
        {LEADER_CARDS.map((card) => (
          <LeaderCard
            key={card.key}
            title={card.title}
            className={card.className}
            entries={leaders?.[card.key] ?? []}
            showSkeleton={showSkeleton}
          />
        ))}
      </section>

      <section className="data-table-wrap">
        <div className="panel-card-header">
          <h2 className="font-display text-lg font-bold text-slate-900">Personel Performans Tablosu</h2>
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
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Seçilen aralıkta veri yok. Modüllere veri ekleyip tekrar deneyin.
                  </td>
                </tr>
              ) : (
                sortedRows.map((person) => (
                  <tr key={person.personelName}>
                    <td className="!font-semibold !text-slate-900">{person.personelName}</td>
                    <td className="tabular-nums">{person.uyeAdedi}</td>
                    <td className="tabular-nums">{person.ortalamaAramaAdedi}</td>
                    <td className="tabular-nums">{formatDuration(person.ortalamaKonusmaSuresi)}</td>
                    <td className="tabular-nums">{person.ortalamaCagriPuani}</td>
                    <td className="tabular-nums">{person.ortalamaWhatsappCevapsiz}</td>
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

function LeaderCard({
  title,
  className,
  entries,
  showSkeleton,
}: {
  title: string;
  className: string;
  entries: LeaderEntry[];
  showSkeleton: boolean;
}) {
  const padded = [...entries];
  while (padded.length < 3) {
    padded.push({ personelName: "—", display: "—" });
  }

  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col rounded-2xl bg-gradient-to-br p-5 text-white shadow-panel-lg ring-1 ring-white/10",
        className,
      )}
    >
      <h3 className="mb-4 text-center text-xs font-extrabold uppercase leading-snug tracking-wide">
        {title}
      </h3>
      <div className="flex flex-1 flex-col gap-2">
        {showSkeleton
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/20" />
            ))
          : padded.slice(0, 3).map((entry, i) => (
              <div
                key={`${entry.personelName}-${i}`}
                className="rounded-xl bg-black/15 px-3 py-2.5 backdrop-blur-sm"
              >
                <p className="truncate text-sm font-bold">{entry.personelName}</p>
                <p className="text-xs font-medium text-white/90">{entry.display}</p>
              </div>
            ))}
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return <TableSortIcon active={active} dir={dir} />;
}
