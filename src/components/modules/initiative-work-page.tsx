"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useMonthYearRange } from "@/hooks/use-month-year-range";
import { currentMonthYear } from "@/lib/month-year";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatWorkDuration } from "@/lib/initiative-work";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { invalidatePrefixes } from "@/lib/panel-cache";

type Row = {
  id: string;
  personelName: string;
  recordDate: string;
  callCount: number;
  talkDurationSeconds: number;
  memberCount: number;
  createdAt: string;
};

type SummaryRow = {
  personelName: string;
  calismaAdedi: number;
};

type ApiResponse = {
  rows: Row[];
  summary: SummaryRow[];
  total: number;
  truncated?: boolean;
};

const emptyForm = () => ({
  personelName: "",
  recordDate: new Date().toISOString().slice(0, 10),
  callCount: "",
  talkDuration: "",
  memberCount: "",
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

function periodLabelFromRange(from: string, to: string, fallback: string) {
  if (from && to) {
    return `${new Date(from).toLocaleDateString("tr-TR")} - ${new Date(to).toLocaleDateString("tr-TR")}`;
  }
  if (from) return `${new Date(from).toLocaleDateString("tr-TR")} -`;
  if (to) return `- ${new Date(to).toLocaleDateString("tr-TR")}`;
  return fallback;
}

export function InitiativeWorkPage() {
  const defaultPeriod = currentMonthYear();
  const [filters, setFilters] = usePersistedPageState("insiyatif-calisma", {
    search: "",
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    customFrom: "",
    customTo: "",
    sortDir: "desc" as "asc" | "desc",
  });
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const { month, year, from, to, periodLabel, setMonthYear } = useMonthYearRange(
    filters,
    patchFilters,
  );
  const effectiveFrom = filters.customFrom || from;
  const effectiveTo = filters.customTo || to;
  const hasCustomRange = Boolean(filters.customFrom || filters.customTo);
  const effectivePeriodLabel = periodLabelFromRange(
    filters.customFrom,
    filters.customTo,
    periodLabel,
  );
  const setMonthYearAndClearRange = (nextMonth: number, nextYear: number) => {
    setMonthYear(nextMonth, nextYear);
    patchFilters({ customFrom: "", customTo: "" });
  };

  const params = useMemo(() => {
    const p = new URLSearchParams({
      from: effectiveFrom,
      to: effectiveTo,
      sortDir: filters.sortDir,
    });
    if (filters.search) p.set("search", filters.search);
    return p;
  }, [effectiveFrom, effectiveTo, filters.search, filters.sortDir]);

  const { data, showSkeleton, refreshing, error } = usePanelFetch<ApiResponse>(
    "/api/initiative-work",
    params,
    { debounceMs: 0 },
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const summary = useMemo(() => data?.summary ?? [], [data?.summary]);
  const { search, sortDir } = filters;
  const summarySort = useClientTableSort<"personelName" | "calismaAdedi">(
    "personelName",
    "asc",
  );
  const rowSort = useClientTableSort<
    "createdAt" | "recordDate" | "personelName" | "callCount" | "talkDurationSeconds" | "memberCount"
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

  const summaryTotal = useMemo(
    () => summary.reduce((total, row) => total + row.calismaAdedi, 0),
    [summary],
  );

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
      recordDate: row.recordDate.slice(0, 10),
      callCount: String(row.callCount),
      talkDuration: formatWorkDuration(row.talkDurationSeconds),
      memberCount: String(row.memberCount),
    });
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch(
      editingId ? `/api/initiative-work/${editingId}` : "/api/initiative-work",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          personelName: form.personelName,
          recordDate: form.recordDate,
          callCount: Number(form.callCount),
          talkDuration: form.talkDuration,
          memberCount: Number(form.memberCount),
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kayıt kaydedilemedi", type: "error" });
      return;
    }
    closeForm();
    invalidatePrefixes(["/api/initiative-work"]);
    setMessage({ text: editingId ? "Kayıt güncellendi" : "Kayıt eklendi", type: "ok" });
  }

  async function remove(row: Row) {
    if (!confirm(`${row.personelName} kaydı silinsin mi?`)) return;
    const res = await fetch(`/api/initiative-work/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kayıt silinemedi", type: "error" });
      return;
    }
    invalidatePrefixes(["/api/initiative-work"]);
    setMessage({ text: "Kayıt silindi", type: "ok" });
  }

  function exportExcel() {
    const p = new URLSearchParams({ from: effectiveFrom, to: effectiveTo });
    if (search) p.set("search", search);
    window.open(`/api/initiative-work/export?${p}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">İnsiyatif Çalışma</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kendi insiyatifi ile çalışan personellerin çalışma kayıtları.
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
              Ekle
              <ChevronDown className={cn("h-4 w-4 transition-transform", formOpen && "rotate-180")} />
            </Button>

            {formOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),28rem)] animate-fade-in">
                <form
                  onSubmit={submit}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel-lg ring-1 ring-slate-100"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {editingId ? "Kaydı Düzenle" : "Yeni Çalışma Kaydı"}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">Bilgileri girin ve ekleyin</p>
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
                    <Field label="Çalıştığı Tarih">
                      <Input
                        type="date"
                        value={form.recordDate}
                        onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Arama Adedi">
                      <Input
                        type="number"
                        min={0}
                        value={form.callCount}
                        onChange={(e) => setForm({ ...form, callCount: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Konuşma Süresi">
                      <Input
                        value={form.talkDuration}
                        onChange={(e) => setForm({ ...form, talkDuration: e.target.value })}
                        placeholder="01:20:30 veya saniye"
                        required
                      />
                    </Field>
                    <Field label="Üye Adedi">
                      <Input
                        type="number"
                        min={0}
                        value={form.memberCount}
                        onChange={(e) => setForm({ ...form, memberCount: e.target.value })}
                        required
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Ekle"}
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
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <RefreshingHint show={refreshing && rows.length > 0} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Filtreleme</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Seçilen dönem: <span className="font-semibold text-slate-800">{effectivePeriodLabel}</span>
          </p>
        </div>
        <div className="grid gap-4 border-b border-slate-100 px-5 py-4 xl:grid-cols-[minmax(220px,320px)_minmax(260px,1fr)_minmax(220px,1fr)_auto_auto] xl:items-end">
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
          <label className="block">
            <span className="filter-label">Arama</span>
            <Input
              placeholder="Personel ara"
              value={search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="filter-label">Yön</span>
            <select
              className="panel-input"
              value={sortDir}
              onChange={(e) => {
                const nextSortDir = e.target.value as "asc" | "desc";
                patchFilters({ sortDir: nextSortDir });
                rowSort.setSortDir(nextSortDir);
              }}
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </label>
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
      </section>

      {data?.truncated ? (
        <p className="text-xs font-medium text-amber-700">
          Kayıt üst sınırına ulaşıldı; tarih aralığını daraltmanız önerilir.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Çalışma Özeti</h2>
          <p className="mt-0.5 text-sm text-slate-500">Personel bazında çalışma adedi</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <SortableTh
                  label="Personel İsmi"
                  sortKey="personelName"
                  activeKey={summarySort.sortKey}
                  dir={summarySort.sortDir}
                  onSort={(key) => summarySort.toggleSort(key as typeof summarySort.sortKey)}
                  className="px-5 py-3"
                />
                <SortableTh
                  label="Çalışma Adet"
                  sortKey="calismaAdedi"
                  activeKey={summarySort.sortKey}
                  dir={summarySort.sortDir}
                  onSort={(key) => summarySort.toggleSort(key as typeof summarySort.sortKey)}
                  className="px-5 py-3"
                />
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-slate-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-slate-500">
                    Bu tarih aralığında kayıt yok.
                  </td>
                </tr>
              ) : (
                <>
                  {sortedSummary.map((row, index) => (
                    <tr
                      key={row.personelName}
                      className={cn("border-t border-slate-100", index % 2 === 1 && "bg-slate-50/60")}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900">{row.personelName}</td>
                      <td className="px-5 py-3">{row.calismaAdedi}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-brand-50/50 font-semibold text-slate-900">
                    <td className="px-5 py-3">Toplam</td>
                    <td className="px-5 py-3">{summaryTotal}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Tüm Kayıtlar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortableTh
                  label="Eklenme Tarihi"
                  sortKey="createdAt"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Çalıştığı Tarih"
                  sortKey="recordDate"
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
                  label="Arama Adedi"
                  sortKey="callCount"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Konuşma Süresi"
                  sortKey="talkDurationSeconds"
                  activeKey={rowSort.sortKey}
                  dir={rowSort.sortDir}
                  onSort={(key) => rowSort.toggleSort(key as typeof rowSort.sortKey)}
                  className="px-4 py-3"
                />
                <SortableTh
                  label="Üye Adedi"
                  sortKey="memberCount"
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
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.recordDate)}</td>
                    <td className="px-4 py-3 font-medium">{row.personelName}</td>
                    <td className="px-4 py-3">{row.callCount}</td>
                    <td className="px-4 py-3">{formatWorkDuration(row.talkDurationSeconds)}</td>
                    <td className="px-4 py-3">{row.memberCount}</td>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}