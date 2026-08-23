"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  dateRangeFilterPatch,
  dateRangePeriodLabel,
  resolveDateRangeFromFilters,
  type DateRangePreset,
} from "@/lib/date-range-filter";
import type { Period } from "@/lib/date-ranges";
import { PERIOD_LABELS } from "@/lib/date-ranges";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { invalidateModuleDataCaches } from "@/lib/panel-cache";
import { MetricCard } from "@/components/ui/metric-card";
import { PersonCard } from "@/components/ui/person-card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import {
  EXAMPLE_CALL_TYPE_LABELS,
  type ExampleCallPeriodCounts,
  type ExampleCallType,
} from "@/lib/example-call";

type Row = {
  id: string;
  personelName: string;
  recordType: ExampleCallType;
  phone: string;
  recordDate: string;
  createdAt: string;
};

type SummaryRow = {
  personelName: string;
  ornekCagriAdedi: number;
  motivasyonAdedi: number;
};

type ApiResponse = {
  rows: Row[];
  summary: SummaryRow[];
  total: number;
  truncated?: boolean;
  periodCounts?: {
    daily: ExampleCallPeriodCounts;
    weekly: ExampleCallPeriodCounts;
    monthly: ExampleCallPeriodCounts;
  };
};

const emptyForm = () => ({
  recordType: "ORNEK_CAGRI" as ExampleCallType,
  personelName: "",
  recordDate: new Date().toISOString().slice(0, 10),
  phone: "",
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExampleCallPage() {
  const [filters, setFilters] = usePersistedPageState("ornek-cagri", {
    search: "",
    datePreset: "today" as DateRangePreset,
    customFrom: "",
    customTo: "",
    sortDir: "desc" as "asc" | "desc",
    period: "daily" as Period,
  });
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((current) => ({ ...current, ...patch }));
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
    const p = new URLSearchParams({
      from: effectiveFrom,
      to: effectiveTo,
      sortDir: filters.sortDir,
    });
    if (filters.search) p.set("search", filters.search);
    return p;
  }, [effectiveFrom, effectiveTo, filters.search, filters.sortDir]);

  const { data, showSkeleton, refreshing, error, reload } = usePanelFetch<ApiResponse>(
    "/api/example-calls",
    params,
    { debounceMs: 0 },
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const summary = useMemo(() => data?.summary ?? [], [data?.summary]);
  const periodCounts = data?.periodCounts;
  const { search, period } = filters;
  const summarySort = useClientTableSort<"personelName" | "ornekCagriAdedi" | "motivasyonAdedi">(
    "personelName",
    "asc",
  );
  const rowSort = useClientTableSort<
    "createdAt" | "recordDate" | "personelName" | "phone" | "recordType"
  >("recordDate", "desc");

  const sortedSummary = useMemo(() => summarySort.sort(summary), [summary, summarySort]);
  const sortedRows = useMemo(() => rowSort.sort(rows), [rows, rowSort]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);
  const formAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) setMessage({ text: error, type: "error" });
  }, [error]);

  useEffect(() => {
    if (!formOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeForm();
    }
    function onClick(event: MouseEvent) {
      if (formAnchorRef.current && !formAnchorRef.current.contains(event.target as Node)) {
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

  const summaryTotals = useMemo(
    () => ({
      ornekCagri: summary.reduce((total, row) => total + row.ornekCagriAdedi, 0),
      motivasyon: summary.reduce((total, row) => total + row.motivasyonAdedi, 0),
    }),
    [summary],
  );
  const summaryTotal = summaryTotals.ornekCagri + summaryTotals.motivasyon;

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
      recordType: row.recordType ?? "ORNEK_CAGRI",
      personelName: row.personelName,
      recordDate: row.recordDate.slice(0, 10),
      phone: row.phone,
    });
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch(editingId ? `/api/example-calls/${editingId}` : "/api/example-calls", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kayıt kaydedilemedi", type: "error" });
      return;
    }
    closeForm();
    invalidateModuleDataCaches("EXAMPLE_CALL");
    setMessage({ text: editingId ? "Kayıt güncellendi" : "Kayıt eklendi", type: "ok" });
  }

  async function remove(row: Row) {
    if (!confirm(`${row.personelName} kaydı silinsin mi?`)) return;
    const res = await fetch(`/api/example-calls/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kayıt silinemedi", type: "error" });
      return;
    }
    invalidateModuleDataCaches("EXAMPLE_CALL");
    setMessage({ text: "Kayıt silindi", type: "ok" });
  }

  function exportExcel() {
    const p = new URLSearchParams({ from: effectiveFrom, to: effectiveTo });
    if (search) p.set("search", search);
    window.open(`/api/example-calls/export?${p}`, "_blank");
  }

  const periods: Period[] = ["daily", "weekly", "monthly"];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Operasyon"
        title="Örnek Çağrı ve Motivasyon"
        description="Personel bazında iletilen örnek çağrı ve motivasyon adetleri."
        toolbar={
          <DateRangePicker
            value={range}
            onChange={(next) => patchFilters(dateRangeFilterPatch(next))}
            onRefresh={() => void reload({ silent: true, force: true })}
            refreshing={refreshing}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div ref={formAnchorRef} className="relative">
              <Button
                type="button"
                onClick={() => (formOpen && !editingId ? closeForm() : openNewForm())}
                className={cn(formOpen && "ring-2 ring-brand-300")}
              >
                <Plus className="h-4 w-4" />
                Ekle
                <ChevronDown className={cn("h-4 w-4 transition-transform", formOpen && "rotate-180")} />
              </Button>
              {formOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),28rem)] animate-fade-in">
                  <form
                    onSubmit={submit}
                    className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-panel-lg"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          {editingId ? "Kaydı Düzenle" : "Yeni Kayıt"}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Alan seçin, ardından personel ve tarih girin
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
                      <div>
                        <Label>Alan</Label>
                        <select
                          className="panel-input"
                          value={form.recordType}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              recordType: e.target.value as ExampleCallType,
                              phone: e.target.value === "MOTIVASYON" ? "" : form.phone,
                            })
                          }
                          required
                        >
                          <option value="ORNEK_CAGRI">Örnek Çağrı</option>
                          <option value="MOTIVASYON">Motivasyon</option>
                        </select>
                      </div>
                      <div>
                        <Label>Personel Adı</Label>
                        <Input
                          value={form.personelName}
                          onChange={(e) => setForm({ ...form, personelName: e.target.value })}
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label>Tarih</Label>
                        <Input
                          type="date"
                          value={form.recordDate}
                          onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                          required
                        />
                      </div>
                      {form.recordType === "ORNEK_CAGRI" ? (
                        <div>
                          <Label>Numara</Label>
                          <Input
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            required
                          />
                        </div>
                      ) : null}
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
        }
      />

      {message ? (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium",
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <RefreshingHint show={refreshing && rows.length > 0} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Örnek çağrı"
          value={summaryTotals.ornekCagri}
          hint={effectivePeriodLabel}
          tone="blue"
        />
        <MetricCard
          label="Motivasyon"
          value={summaryTotals.motivasyon}
          hint={effectivePeriodLabel}
          tone="emerald"
        />
        <MetricCard label="Toplam adet" value={summaryTotal} hint="İki alan toplamı" tone="amber" />
        <MetricCard label="Personel" value={summary.length} hint="Kayıtı olan kişi" tone="violet" />
      </section>

      <section className="panel-card overflow-hidden">
        <SectionHeader title="Dönem özeti" description="Günlük, haftalık ve aylık adetler" />
        <div className="space-y-4 p-5">
          <div className="segmented-control">
            {periods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => patchFilters({ period: item })}
                className={cn("segmented-item", period === item && "segmented-item-active")}
              >
                {PERIOD_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {periods.map((item) => {
              const counts = periodCounts?.[item];
              return (
                <div
                  key={item}
                  className={cn("panel-card p-4", period === item && "ring-1 ring-brand-500/25")}
                >
                  <p className="kicker">{PERIOD_LABELS[item]}</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-brand-700">
                    {counts?.toplam ?? 0}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Örnek çağrı: <span className="font-semibold">{counts?.ornekCagri ?? 0}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Motivasyon: <span className="font-semibold">{counts?.motivasyon ?? 0}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{counts?.personel ?? 0} personel</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        <SectionHeader
          title="Filtreleme"
          description={
            <>
              Seçilen dönem: <span className="font-semibold text-slate-800">{effectivePeriodLabel}</span>
            </>
          }
        />
        <div className="px-5 py-4">
          <label className="block max-w-md">
            <span className="filter-label">Arama</span>
            <Input
              placeholder="Personel veya numara"
              value={search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        <SectionHeader
          title="Personel özeti"
          description="Seçilen aralıkta örnek çağrı ve motivasyon adetleri"
        />
        <div className="p-5">
          {showSkeleton ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : summary.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Bu tarih aralığında kayıt yok.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedSummary.map((row) => (
                <PersonCard
                  key={row.personelName}
                  name={row.personelName}
                  stats={[
                    { label: "Örnek çağrı", value: row.ornekCagriAdedi },
                    { label: "Motivasyon", value: row.motivasyonAdedi },
                  ]}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">
            Geçmiş kayıtlar
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortableTh
                  label="Eklenme"
                  sortKey="createdAt"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Tarih"
                  sortKey="recordDate"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Alan"
                  sortKey="recordType"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Personel"
                  sortKey="personelName"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Numara"
                  sortKey="phone"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
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
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.recordDate)}</td>
                    <td className="px-4 py-3">
                      {EXAMPLE_CALL_TYPE_LABELS[row.recordType] ?? "Örnek Çağrı"}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.personelName}</td>
                    <td className="px-4 py-3">
                      {row.recordType === "MOTIVASYON" ? "—" : row.phone}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          className="rounded p-1 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row)}
                          className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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
