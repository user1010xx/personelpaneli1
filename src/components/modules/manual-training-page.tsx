"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useMonthYearRange } from "@/hooks/use-month-year-range";
import { currentMonthYear } from "@/lib/month-year";
import type { TrainingRecordType } from "@prisma/client";
import type { Period } from "@/lib/date-ranges";
import type { TrainingPeriodCounts } from "@/lib/training";
import { TRAINING_RECORD_LABELS } from "@/lib/training";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { DataFilters } from "@/components/modules/data-filters";
import { TrainingPeriodStats } from "@/components/modules/training-period-stats";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { usePersistedPageState } from "@/hooks/use-persisted-page-state";
import { RefreshingHint } from "@/components/ui/refreshing-hint";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { invalidateDataCaches } from "@/lib/panel-cache";

type Row = {
  id: string;
  personelName: string;
  recordType: TrainingRecordType;
  recordDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  trainer: string;
  createdAt: string;
};

type SummaryRow = {
  personelName: string;
  egitimAdedi: number;
  geribildirimAdedi: number;
};

type TrainingApiResponse = {
  rows: Row[];
  summary: SummaryRow[];
  periodCounts: {
    daily: TrainingPeriodCounts;
    weekly: TrainingPeriodCounts;
    monthly: TrainingPeriodCounts;
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
  recordType: "EGITIM" as TrainingRecordType,
  recordDate: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "10:00",
  topic: "",
  trainer: "",
});

export function ManualTrainingPage() {
  const defaultPeriod = currentMonthYear();
  const [filters, setFilters] = usePersistedPageState("egitim", {
    search: "",
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    sortDir: "desc" as "asc" | "desc",
    period: "daily" as Period,
  });
  const patchFilters = (patch: Partial<typeof filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const { month, year, from, to, periodLabel, setMonthYear } = useMonthYearRange(
    filters,
    patchFilters,
  );
  const params = useMemo(() => {
    const p = new URLSearchParams({
      search: filters.search,
      sortDir: filters.sortDir,
      period: filters.period,
      from,
      to,
    });
    return p;
  }, [filters, from, to]);

  const { data, showSkeleton, refreshing, error, invalidate } = usePanelFetch<TrainingApiResponse>(
    "/api/training",
    params,
    { debounceMs: 0 },
  );

  const rows = data?.rows ?? [];
  const summary = data?.summary ?? [];
  const periodCounts = data?.periodCounts;
  const { search, sortDir, period } = filters;

  const summarySort = useClientTableSort<"personelName" | "egitimAdedi" | "geribildirimAdedi">(
    "personelName",
    "asc",
  );
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

  const summaryTotals = useMemo(
    () => ({
      egitim: summary.reduce((a, r) => a + r.egitimAdedi, 0),
      geribildirim: summary.reduce((a, r) => a + r.geribildirimAdedi, 0),
    }),
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
      recordType: row.recordType,
      recordDate: row.recordDate.slice(0, 10),
      startTime: row.startTime,
      endTime: row.endTime,
      topic: row.topic,
      trainer: row.trainer,
    });
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const res = await fetch(editingId ? `/api/training/${editingId}` : "/api/training", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      const wasEdit = Boolean(editingId);
      closeForm();
      setMessage(wasEdit ? "Kayıt güncellendi" : "Kayıt kaydedildi");
      invalidateDataCaches();
      invalidate();
    } else {
      setMessage(json.error ?? "Kayıt kaydedilemedi");
    }
  }

  function exportExcel() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search) params.set("search", search);
    window.open(`/api/training/export?${params}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Eğitim Geribildirim</h1>
          <p className="mt-1 text-sm text-slate-500">
            Personel bazında eğitim ve geribildirim özeti — veriler kalıcı olarak saklanır.
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
                      <p className="mt-0.5 text-xs text-slate-500">Bilgileri girin ve kaydedin</p>
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
                    <Field label="Kayıt Türü">
                      <select
                        value={form.recordType}
                        onChange={(e) =>
                          setForm({ ...form, recordType: e.target.value as TrainingRecordType })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        required
                      >
                        <option value="EGITIM">Eğitim</option>
                        <option value="GERIBILDIRIM">Geribildirim</option>
                      </select>
                    </Field>
                    <Field label="Personel Adı">
                      <Input
                        value={form.personelName}
                        onChange={(e) => setForm({ ...form, personelName: e.target.value })}
                        required
                        autoFocus
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
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Başlangıç">
                        <Input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          required
                        />
                      </Field>
                      <Field label="Bitiş">
                        <Input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          required
                        />
                      </Field>
                    </div>
                    <Field label="Konu">
                      <Input
                        value={form.topic}
                        onChange={(e) => setForm({ ...form, topic: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Eğitimi Veren">
                      <Input
                        value={form.trainer}
                        onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                        required
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
          <h2 className="text-lg font-bold text-slate-900">Dönem Özeti</h2>
          <p className="mt-0.5 text-sm text-slate-500">Günlük, haftalık ve aylık eğitim / geribildirim adetleri</p>
        </div>
        <div className="p-5">
          <TrainingPeriodStats
            periodCounts={periodCounts}
            activePeriod={period}
            onPeriodChange={(p) => patchFilters({ period: p })}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Personel Özeti</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Tarih aralığına göre personel bazında eğitim ve geribildirim adetleri
          </p>
        </div>
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="mb-3 text-sm text-slate-500">
            Seçilen dönem: <span className="font-semibold text-slate-800">{periodLabel}</span>
          </p>
          <MonthYearPicker month={month} year={year} onChange={setMonthYear} />
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
                  label="Alınan Eğitim Adedi"
                  sortKey="egitimAdedi"
                  activeKey={summarySort.sortKey}
                  dir={summarySort.sortDir}
                  onSort={(k) => summarySort.toggleSort(k as typeof summarySort.sortKey)}
                  className="px-5 py-3"
                />
                <SortableTh
                  label="Alınan Geribildirim Adedi"
                  sortKey="geribildirimAdedi"
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
                      <td className="px-5 py-3">{row.egitimAdedi}</td>
                      <td className="px-5 py-3">{row.geribildirimAdedi}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-brand-50/50 font-semibold text-slate-900">
                    <td className="px-5 py-3">Toplam</td>
                    <td className="px-5 py-3">{summaryTotals.egitim}</td>
                    <td className="px-5 py-3">{summaryTotals.geribildirim}</td>
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
        onMonthYearChange={setMonthYear}
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
          await fetch(`/api/training/${id}`, { method: "DELETE", credentials: "include" });
          invalidateDataCaches();
      invalidate();
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
    "createdAt" | "recordType" | "personelName" | "startTime" | "topic" | "trainer"
  >("createdAt", "desc");

  const sortedRows = useMemo(
    () =>
      sort(rows, (row, key) => {
        if (key === "createdAt") return row.createdAt;
        if (key === "startTime") return row.startTime;
        return row[key as keyof Row];
      }),
    [rows, sort, sortKey, sortDir],
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
                label="Tür"
                sortKey="recordType"
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
                label="Saat"
                sortKey="startTime"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <SortableTh
                label="Konu"
                sortKey="topic"
                activeKey={sortKey}
                dir={sortDir}
                onSort={(k) => toggleSort(k as typeof sortKey)}
                className="px-4 py-3"
              />
              <SortableTh
                label="Eğitmen"
                sortKey="trainer"
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
                  <td className="whitespace-nowrap px-4 py-3">{formatKayitTarihi(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <RecordTypeBadge type={row.recordType} />
                  </td>
                  <td className="px-4 py-3 font-medium">{row.personelName}</td>
                  <td className="px-4 py-3">
                    {row.startTime} - {row.endTime}
                  </td>
                  <td className="px-4 py-3">{row.topic}</td>
                  <td className="px-4 py-3">{row.trainer}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="rounded p-1 hover:bg-slate-100"
                      >
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

function RecordTypeBadge({ type }: { type: TrainingRecordType }) {
  const isTraining = type === "EGITIM";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isTraining ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800",
      )}
    >
      {TRAINING_RECORD_LABELS[type]}
    </span>
  );
}
