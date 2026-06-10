"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useMonthYearRange } from "@/hooks/use-month-year-range";
import { currentMonthYear } from "@/lib/month-year";
import type { Period } from "@/lib/date-ranges";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DataFilters } from "@/components/modules/data-filters";
import { QualityPeriodStats } from "@/components/modules/quality-period-stats";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { invalidateModuleDataCaches } from "@/lib/panel-cache";

type Row = {
  id: string;
  personelName: string;
  phone: string;
  score: number;
  note: string | null;
  recordDate: string;
  createdAt: string;
};

type SummaryRow = {
  personelName: string;
  adet: number;
  ortalama: number;
};

type QualityApiResponse = {
  rows: Row[];
  summary: SummaryRow[];
  stats: {
    daily: { recordCount: number };
    weekly: { recordCount: number };
    monthly: { recordCount: number };
  };
  periodAverages: {
    daily: number;
    weekly: number;
    monthly: number;
  };
};

function formatKayitTarihi(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const emptyForm = () => ({
  personelName: "",
  phone: "",
  score: "",
  note: "",
  recordDate: new Date().toISOString().slice(0, 10),
});

export function ManualQualityPage() {
  const defaultPeriod = currentMonthYear();
  const [filters, setFilters] = usePersistedPageState("kalite", {
    search: "",
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    customFrom: "",
    customTo: "",
    sortDir: "desc" as "asc" | "desc",
    period: "daily" as Period,
  });
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const { month, year, from, to, periodLabel, setMonthYear } = useMonthYearRange(
    filters,
    patchFilters,
  );
  const hasCustomRange = Boolean(filters.customFrom || filters.customTo);
  const effectiveFrom = filters.customFrom || from;
  const effectiveTo = filters.customTo || to;
  const effectivePeriodLabel =
    filters.customFrom && filters.customTo
      ? `${new Date(filters.customFrom).toLocaleDateString("tr-TR")} - ${new Date(filters.customTo).toLocaleDateString("tr-TR")}`
      : filters.customFrom
        ? `${new Date(filters.customFrom).toLocaleDateString("tr-TR")} - ${new Date(to).toLocaleDateString("tr-TR")}`
        : filters.customTo
          ? `${new Date(from).toLocaleDateString("tr-TR")} - ${new Date(filters.customTo).toLocaleDateString("tr-TR")}`
          : periodLabel;
  const setMonthYearAndClearRange = (nextMonth: number, nextYear: number) => {
    setMonthYear(nextMonth, nextYear);
    patchFilters({ customFrom: "", customTo: "" });
  };
  const params = useMemo(() => {
    const p = new URLSearchParams({
      search: filters.search,
      sortDir: filters.sortDir,
      period: filters.period,
      from: effectiveFrom,
      to: effectiveTo,
    });
    return p;
  }, [effectiveFrom, effectiveTo, filters]);

  const { data, showSkeleton, refreshing, error } = usePanelFetch<QualityApiResponse>(
    "/api/quality",
    params,
    { debounceMs: 0 },
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const summary = useMemo(() => data?.summary ?? [], [data?.summary]);
  const stats = data?.stats;
  const periodAverages = data?.periodAverages;
  const { search, sortDir, period } = filters;

  const summarySort = useClientTableSort<"personelName" | "adet" | "ortalama">("personelName", "asc");
  const sortedSummary = useMemo(
    () => summarySort.sort(summary),
    [summary, summarySort],
  );

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const formAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) setMessage(error);
  }, [error]);

  useEffect(() => {
    if (!formOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeForm();
    }
    function onClick(e: MouseEvent) {
      if (formAnchorRef.current && !formAnchorRef.current.contains(e.target as Node)) {
        closeForm();
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [formOpen]);

  const summaryTotals = useMemo(() => {
    const adet = summary.reduce((a, r) => a + r.adet, 0);
    const totalScore = summary.reduce((a, r) => a + r.ortalama * r.adet, 0);
    return { adet, ortalama: adet > 0 ? Number((totalScore / adet).toFixed(2)) : 0 };
  }, [summary]);

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEditForm(row: Row) {
    setEditingId(row.id);
    setForm({
      personelName: row.personelName,
      phone: row.phone,
      score: String(row.score),
      note: row.note ?? "",
      recordDate: row.recordDate.slice(0, 10),
    });
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const payload = {
      personelName: form.personelName,
      phone: form.phone,
      score: Number(form.score),
      note: form.note,
      recordDate: form.recordDate,
    };
    const res = await fetch(editingId ? `/api/quality/${editingId}` : "/api/quality", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      const wasEdit = Boolean(editingId);
      closeForm();
      setMessage(wasEdit ? "Kayıt güncellendi" : "Kayıt kaydedildi");
      invalidateModuleDataCaches("KALITE");
    } else {
      setMessage(json.error ?? "Kayıt kaydedilemedi");
    }
  }

  function exportExcel() {
    const params = new URLSearchParams();
    if (effectiveFrom) params.set("from", effectiveFrom);
    if (effectiveTo) params.set("to", effectiveTo);
    if (search) params.set("search", search);
    window.open(`/api/quality/export?${params}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Kalite Puanlaması</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manuel kalite kayıtları — veriler kalıcı olarak saklanır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div ref={formAnchorRef} className="relative">
            <Button
              type="button"
              onClick={() => (formOpen && !editingId ? closeForm() : openNewForm())}
              className={cn(formOpen && "ring-2 ring-brand-300")}
            >
              <Plus className="h-4 w-4" />
              Yeni Kayıt
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", formOpen && "rotate-180")}
              />
            </Button>

            {formOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),28rem)] animate-fade-in">
                <form
                  onSubmit={onSubmit}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel-lg ring-1 ring-slate-100"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {editingId ? "Kaydı Düzenle" : "Yeni Kayıt"}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Bilgileri girin ve kaydedin
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Field label="Personel Adı">
                      <Input
                        value={form.personelName}
                        onChange={(e) => setForm({ ...form, personelName: e.target.value })}
                        required
                        autoFocus
                      />
                    </Field>
                    <Field label="Telefon">
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Puan">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={form.score}
                        onChange={(e) => setForm({ ...form, score: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Tarih">
                      <Input
                        type="date"
                        value={form.recordDate}
                        onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Not">
                      <Textarea
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        rows={3}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeForm}>
                      İptal
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>

          <Button variant="secondary" onClick={exportExcel}>
            <Download className="h-4 w-4" />
            Excel İndir
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium",
            message.includes("kaydedildi") || message.includes("güncellendi")
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
          )}
        >
          {message}
        </div>
      ) : null}

      <RefreshingHint show={refreshing && rows.length > 0} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Puan Ortalamaları</h2>
          <p className="mt-0.5 text-sm text-slate-500">Günlük, haftalık ve aylık ortalama kalite puanı</p>
        </div>
        <div className="p-5">
          <QualityPeriodStats
            periodAverages={periodAverages}
            stats={stats}
            activePeriod={period}
            onPeriodChange={(p) => patchFilters({ period: p })}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Personel Özeti</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Tarih aralığına göre personel bazında adet ve ortalama puan
          </p>
        </div>
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="mb-3 text-sm text-slate-500">
            Seçilen dönem: <span className="font-semibold text-slate-800">{effectivePeriodLabel}</span>
          </p>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,320px)_minmax(220px,1fr)_auto] lg:items-end">
            <MonthYearPicker month={month} year={year} onChange={setMonthYearAndClearRange} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="filter-label">Başlangıç</span>
                <Input
                  type="date"
                  value={filters.customFrom}
                  onChange={(e) => patchFilters({ customFrom: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="filter-label">Bitiş</span>
                <Input
                  type="date"
                  value={filters.customTo}
                  onChange={(e) => patchFilters({ customTo: e.target.value })}
                />
              </label>
            </div>
            {hasCustomRange ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => patchFilters({ customFrom: "", customTo: "" })}
              >
                Aylık göster
              </Button>
            ) : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <SortableTh
                  label="Personel"
                  sortKey="personelName"
                  activeKey={summarySort.sortKey}
                  dir={summarySort.sortDir}
                  onSort={(k) => summarySort.toggleSort(k as typeof summarySort.sortKey)}
                  className="px-5 py-3"
                />
                <SortableTh
                  label="Adet"
                  sortKey="adet"
                  activeKey={summarySort.sortKey}
                  dir={summarySort.sortDir}
                  onSort={(k) => summarySort.toggleSort(k as typeof summarySort.sortKey)}
                  className="px-5 py-3"
                />
                <SortableTh
                  label="Ortalama"
                  sortKey="ortalama"
                  activeKey={summarySort.sortKey}
                  dir={summarySort.sortDir}
                  onSort={(k) => summarySort.toggleSort(k as typeof summarySort.sortKey)}
                  className="px-5 py-3"
                />
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                    Bu tarih aralığında kayıt yok.
                  </td>
                </tr>
              ) : (
                <>
                  {sortedSummary.map((row, i) => (
                    <tr
                      key={row.personelName}
                      className={cn("border-t border-slate-100", i % 2 === 1 && "bg-slate-50/60")}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900">{row.personelName}</td>
                      <td className="px-5 py-3">{row.adet}</td>
                      <td className="px-5 py-3">{row.ortalama}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-brand-50/50 font-semibold text-slate-900">
                    <td className="px-5 py-3">Toplam</td>
                    <td className="px-5 py-3">{summaryTotals.adet}</td>
                    <td className="px-5 py-3">{summaryTotals.ortalama}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DataFilters
        search={search}
        onSearchChange={(v) => patchFilters({ search: v })}
        month={month}
        year={year}
        onMonthYearChange={setMonthYearAndClearRange}
        sortBy="date"
        sortDir={sortDir}
        onSortByChange={() => undefined}
        onSortDirChange={(v) => patchFilters({ sortDir: v })}
      />

      <Table
        showSkeleton={showSkeleton}
        rows={rows}
        onEdit={openEditForm}
        onDelete={async (id) => {
          await fetch(`/api/quality/${id}`, { method: "DELETE", credentials: "include" });
          invalidateModuleDataCaches("KALITE");
        }}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Table({
  showSkeleton,
  rows,
  onEdit,
  onDelete,
}: {
  showSkeleton: boolean;
  rows: Row[];
  onEdit: (row: Row) => void;
  onDelete: (id: string) => void;
}) {
  const { sortKey, sortDir, toggleSort, sort } = useClientTableSort<
    "createdAt" | "personelName" | "phone" | "score" | "note"
  >("createdAt", "desc");

  const sortedRows = useMemo(
    () =>
      sort(rows, (row, key) => {
        if (key === "createdAt") return row.createdAt;
        if (key === "score") return row.score;
        return row[key as keyof Row];
      }),
    [rows, sort],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="font-semibold text-slate-900">Tüm Kayıtlar</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <SortableTh
                label="Kayıt Tarihi"
                sortKey="createdAt"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <SortableTh
                label="Personel"
                sortKey="personelName"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <SortableTh
                label="Telefon"
                sortKey="phone"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <SortableTh
                label="Puan"
                sortKey="score"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <SortableTh
                label="Not"
                sortKey="note"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Yükleniyor...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-3">{formatKayitTarihi(row.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{row.personelName}</td>
                  <td className="px-4 py-3">{row.phone}</td>
                  <td className="px-4 py-3">{row.score}</td>
                  <td className="max-w-xs truncate px-4 py-3">{row.note}</td>
                  <td className="px-4 py-3">
                    <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: Row;
  onEdit: (row: Row) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex gap-1">
      <button type="button" onClick={() => onEdit(row)} className="rounded p-1 hover:bg-slate-100">
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(row.id)}
        className="rounded p-1 text-rose-600 hover:bg-rose-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
