"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Pencil, Plus, X } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  dateRangeFilterPatch,
  dateRangePeriodLabel,
  resolveDateRangeFromFilters,
  type DateRangePreset,
} from "@/lib/date-range-filter";
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
import { invalidateModuleDataCaches } from "@/lib/panel-cache";
import { MetricCard } from "@/components/ui/metric-card";
import { PersonCard } from "@/components/ui/person-card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";

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
  truncated?: boolean;
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

const emptyForm = (recordType: TrainingRecordType = "EGITIM") => ({
  personelName: "",
  recordType,
  recordDate: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "10:00",
  topic: "",
  trainer: "",
});

type FeedbackPageConfig = {
  title?: string;
  description?: string;
  persistKey?: string;
  apiPath?: string;
  cacheModule?: string;
  imageSrc?: string;
  trainerLabel?: string;
  primaryTypeLabel?: string;
  kicker?: string;
  lockRecordType?: TrainingRecordType;
  hideRecordType?: boolean;
  periodStatsMode?: "split" | "simple";
};

export function ManualTrainingPage({
  title = "Eğitim Geribildirim",
  description = "Eğitim ve geribildirim kayıtları silinmez. Tüm geçmiş bu ekranda kalır.",
  persistKey = "egitim",
  apiPath = "/api/training",
  cacheModule = "EGITIM",
  imageSrc = "/visuals/graduation.jpg",
  trainerLabel = "Eğitimi Veren",
  primaryTypeLabel = "Eğitim",
  kicker = "Operasyon",
  lockRecordType,
  hideRecordType = false,
  periodStatsMode = "split",
}: FeedbackPageConfig) {
  const [filters, setFilters] = usePersistedPageState(persistKey, {
    search: "",
    datePreset: "today" as DateRangePreset,
    customFrom: "",
    customTo: "",
    sortDir: "desc" as "asc" | "desc",
    period: "daily" as Period,
  });
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
    const p = new URLSearchParams({
      search: filters.search,
      sortDir: filters.sortDir,
      period: filters.period,
      from: effectiveFrom,
      to: effectiveTo,
      pageSize: "5000",
    });
    return p;
  }, [effectiveFrom, effectiveTo, filters.search, filters.sortDir, filters.period]);

  const { data, showSkeleton, refreshing, error, reload } = usePanelFetch<TrainingApiResponse>(
    apiPath,
    params,
    { debounceMs: 0 },
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const summary = useMemo(() => data?.summary ?? [], [data?.summary]);
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

  const defaultRecordType = lockRecordType ?? "EGITIM";
  const [form, setForm] = useState(() => emptyForm(defaultRecordType));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const formAnchorRef = useRef<HTMLDivElement>(null);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm(defaultRecordType));
  }, [defaultRecordType]);

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
  }, [formOpen, closeForm]);

  const summaryTotals = useMemo(
    () => ({
      egitim: summary.reduce((a, r) => a + r.egitimAdedi, 0),
      geribildirim: summary.reduce((a, r) => a + r.geribildirimAdedi, 0),
    }),
    [summary],
  );

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm(defaultRecordType));
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
    const res = await fetch(editingId ? `${apiPath}/${editingId}` : apiPath, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        recordType: lockRecordType ?? form.recordType,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      const wasEdit = Boolean(editingId);
      closeForm();
      setMessage(wasEdit ? "Kayıt güncellendi" : "Kayıt kaydedildi");
      invalidateModuleDataCaches(cacheModule);
    } else {
      setMessage(json.error ?? "Kayıt kaydedilemedi");
    }
  }

  function exportExcel() {
    const params = new URLSearchParams();
    if (effectiveFrom) params.set("from", effectiveFrom);
    if (effectiveTo) params.set("to", effectiveTo);
    if (search) params.set("search", search);
    window.open(`${apiPath}/export?${params}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={kicker}
        title={title}
        description={description}
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
              Yeni Kayıt
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", formOpen && "rotate-180")}
              />
            </Button>

            {formOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),28rem)] animate-fade-in">
                <form
                  onSubmit={onSubmit}
                  className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-panel-lg"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {editingId ? "Kaydı Düzenle" : "Yeni Kayıt"}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {lockRecordType
                          ? "Bilgileri girin ve kaydedin"
                          : "Önce Eğitim veya Geribildirim seçin, ardından bilgileri girin"}
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
                    {lockRecordType ? null : (
                      <Field label="Alan">
                        <select
                          value={form.recordType}
                          onChange={(e) =>
                            setForm({ ...form, recordType: e.target.value as TrainingRecordType })
                          }
                          className="panel-input"
                          required
                        >
                          <option value="EGITIM">Eğitim</option>
                          <option value="GERIBILDIRIM">Geribildirim</option>
                        </select>
                      </Field>
                    )}
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
                    <Field
                      label={
                        lockRecordType
                          ? trainerLabel
                          : form.recordType === "GERIBILDIRIM"
                            ? "Geribildirimi Veren"
                            : "Eğitimi Veren"
                      }
                    >
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
        }
      />

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

      {data?.truncated ? (
        <p className="text-xs font-medium text-amber-700">
          Özet kayıt üst sınırı nedeniyle eksik hesaplanmış olabilir. Tarih aralığını daraltmayı
          deneyin.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hideRecordType ? (
          <MetricCard
            label={primaryTypeLabel}
            value={summaryTotals.egitim + summaryTotals.geribildirim}
            hint={effectivePeriodLabel}
            imageSrc={imageSrc}
            tone="emerald"
          />
        ) : (
          <>
            <MetricCard
              label={primaryTypeLabel}
              value={summaryTotals.egitim}
              hint={effectivePeriodLabel}
              imageSrc={imageSrc}
              tone="emerald"
            />
            <MetricCard
              label="Geribildirim"
              value={summaryTotals.geribildirim}
              hint="İletilen adet"
              imageSrc="/visuals/graduation.jpg"
              tone="violet"
            />
          </>
        )}
        <MetricCard
          label="Personel"
          value={summary.length}
          hint="Kayıtı olan kişi"
          tone="blue"
        />
        <MetricCard
          label="Toplam kayıt"
          value={rows.length}
          hint="Geçmiş satır"
          tone="slate"
        />
      </section>

      <section className="panel-card overflow-hidden">
        <SectionHeader
          title="Dönem Özeti"
          description="Günlük, haftalık ve aylık eğitim / geribildirim adetleri"
        />
        <div className="p-5">
          <TrainingPeriodStats
            periodCounts={periodCounts}
            activePeriod={period}
            onPeriodChange={(p) => patchFilters({ period: p })}
            mode={periodStatsMode}
          />
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        <SectionHeader
          title="Personel Özeti"
          description="Tarih aralığına göre personel bazında eğitim ve geribildirim adetleri"
        />
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm text-slate-500">
            Seçilen dönem: <span className="font-semibold text-slate-800">{effectivePeriodLabel}</span>
          </p>
        </div>
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
              {sortedSummary.map((row) => (
                <PersonCard
                  key={row.personelName}
                  name={row.personelName}
                  stats={
                    hideRecordType
                      ? [
                          {
                            label: primaryTypeLabel,
                            value: row.egitimAdedi + row.geribildirimAdedi,
                          },
                        ]
                      : [
                          { label: primaryTypeLabel, value: row.egitimAdedi },
                          { label: "Geribildirim", value: row.geribildirimAdedi },
                        ]
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <DataFilters
        search={search}
        onSearchChange={(v) => patchFilters({ search: v })}
        sortBy="date"
        sortDir={sortDir}
        onSortByChange={() => undefined}
        onSortDirChange={(v) => patchFilters({ sortDir: v })}
      />

      <Table
        showSkeleton={showSkeleton}
        rows={rows}
        onEdit={openEditForm}
        trainerLabel={trainerLabel}
        primaryTypeLabel={primaryTypeLabel}
        hideRecordType={hideRecordType}
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
  trainerLabel,
  primaryTypeLabel,
  hideRecordType,
}: {
  showSkeleton: boolean;
  rows: Row[];
  onEdit: (row: Row) => void;
  trainerLabel: string;
  primaryTypeLabel: string;
  hideRecordType: boolean;
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
    [rows, sort],
  );

  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">Geçmiş kayıtlar</h2>
        <p className="text-xs text-slate-500">Eklenen kayıtlar silinmez.</p>
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
              {hideRecordType ? null : (
                <SortableTh
                  label="Tür"
                  sortKey="recordType"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(k) => toggleSort(k as typeof sortKey)}
                  className="px-4 py-3"
                />
              )}
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
                label={trainerLabel}
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
                <td colSpan={hideRecordType ? 6 : 7} className="px-4 py-8 text-center text-slate-500">
                  Yükleniyor...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={hideRecordType ? 6 : 7} className="px-4 py-8 text-center text-slate-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-3">{formatKayitTarihi(row.createdAt)}</td>
                  {hideRecordType ? null : (
                    <td className="px-4 py-3">
                      <RecordTypeBadge type={row.recordType} primaryTypeLabel={primaryTypeLabel} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">{row.personelName}</td>
                  <td className="px-4 py-3">
                    {row.startTime} - {row.endTime}
                  </td>
                  <td className="px-4 py-3">{row.topic}</td>
                  <td className="px-4 py-3">{row.trainer}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded p-1 hover:bg-slate-100"
                      aria-label="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
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

function RecordTypeBadge({
  type,
  primaryTypeLabel,
}: {
  type: TrainingRecordType;
  primaryTypeLabel: string;
}) {
  const isTraining = type === "EGITIM";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isTraining ? "bg-brand-100 text-brand-800" : "bg-teal-100 text-teal-900",
      )}
    >
      {isTraining ? primaryTypeLabel : TRAINING_RECORD_LABELS.GERIBILDIRIM}
    </span>
  );
}
