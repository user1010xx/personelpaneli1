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
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatWorkDuration } from "@/lib/initiative-work";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { invalidatePrefixes } from "@/lib/panel-cache";
import { MetricCard } from "@/components/ui/metric-card";
import { PersonCard } from "@/components/ui/person-card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";

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

export function InitiativeWorkPage() {
  const [filters, setFilters] = usePersistedPageState("insiyatif-calisma", {
    search: "",
    datePreset: "today" as DateRangePreset,
    customFrom: "",
    customTo: "",
    sortDir: "desc" as "asc" | "desc",
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
  const initiativeTotals = useMemo(
    () => ({
      callCount: rows.reduce((total, row) => total + row.callCount, 0),
      memberCount: rows.reduce((total, row) => total + row.memberCount, 0),
      talkSeconds: rows.reduce((total, row) => total + row.talkDurationSeconds, 0),
    }),
    [rows],
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
      <PageHeader
        kicker="Operasyon"
        title="İnsiyatif Çalışma"
        description="Kendi insiyatifiyle alınan çağrıların kaydı, özet kartları ve geçmişi."
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
          label="Çalışma kaydı"
          value={summaryTotal}
          hint={effectivePeriodLabel}
          imageSrc="/visuals/briefcase.jpg"
          tone="amber"
        />
        <MetricCard
          label="Toplam arama"
          value={initiativeTotals.callCount}
          hint="İnsiyatif çağrıları"
          tone="blue"
        />
        <MetricCard
          label="Toplam üye"
          value={initiativeTotals.memberCount}
          hint="Kayıtlı üye adedi"
          tone="emerald"
        />
        <MetricCard
          label="Konuşma süresi"
          value={formatWorkDuration(initiativeTotals.talkSeconds)}
          hint="Toplam süre"
          tone="violet"
        />
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
        <div className="flex flex-wrap items-end gap-4 border-b border-slate-100 px-5 py-4">
          <label className="block min-w-[200px] flex-1">
            <span className="filter-label">Arama</span>
            <Input
              placeholder="Personel ara"
              value={search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
          </label>
          <label className="block min-w-[140px]">
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
        </div>
      </section>

      {data?.truncated ? (
        <p className="text-xs font-medium text-amber-700">
          Kayıt üst sınırına ulaşıldı; tarih aralığını daraltmanız önerilir.
        </p>
      ) : null}

      <section className="panel-card overflow-hidden">
        <SectionHeader
          title="Çalışma Özeti"
          description="Personel bazında çalışma adedi"
        />
        <div className="p-5">
          {showSkeleton ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : summary.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Bu tarih aralığında kayıt yok.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedSummary.map((row) => {
                const personRows = rows.filter((item) => item.personelName === row.personelName);
                return (
                  <PersonCard
                    key={row.personelName}
                    name={row.personelName}
                    stats={[
                      { label: "Çalışma adedi", value: row.calismaAdedi },
                      {
                        label: "Arama",
                        value: personRows.reduce((total, item) => total + item.callCount, 0),
                      },
                      {
                        label: "Üye",
                        value: personRows.reduce((total, item) => total + item.memberCount, 0),
                      },
                      {
                        label: "Süre",
                        value: formatWorkDuration(
                          personRows.reduce((total, item) => total + item.talkDurationSeconds, 0),
                        ),
                      },
                    ]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">
            Geçmiş çalışmalar
          </h2>
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