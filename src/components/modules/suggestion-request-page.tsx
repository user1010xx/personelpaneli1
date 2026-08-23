"use client";

import { FormEvent, useMemo, useState } from "react";
import type { SuggestionRequestType } from "@prisma/client";
import { Eye, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { PageHeader } from "@/components/ui/page-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  dateRangePeriodLabel,
  resolveDateRange,
  type DateRangeValue,
} from "@/lib/date-range-filter";

type Row = {
  id: string;
  type: SuggestionRequestType;
  reporterName: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  createdByName: string | null;
  canModify: boolean;
};

type Response = {
  rows: Row[];
};

type FormState = {
  type: SuggestionRequestType;
  reporterName: string;
  subject: string;
  content: string;
};

const emptyForm: FormState = {
  type: "TALEP",
  reporterName: "",
  subject: "",
  content: "",
};

function typeLabel(type: SuggestionRequestType) {
  return type === "TALEP" ? "Talep" : "Öneri";
}

export function SuggestionRequestPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);
  const [range, setRange] = useState<DateRangeValue>(() => resolveDateRange("today"));
  const params = useMemo(() => {
    const p = new URLSearchParams({ from: range.from, to: range.to });
    return p;
  }, [range.from, range.to]);
  const { data, error, showSkeleton, refreshing, reload } = usePanelFetch<Response>(
    "/api/suggestion-requests",
    params,
  );

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  function startEdit(row: Row) {
    setEditingId(row.id);
    setSelectedId(row.id);
    setForm({
      type: row.type,
      reporterName: row.reporterName,
      subject: row.subject,
      content: row.content,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(
      editingId ? `/api/suggestion-requests/${editingId}` : "/api/suggestion-requests",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kayıt kaydedilemedi", type: "error" });
      return;
    }
    setMessage({ text: editingId ? "Kayıt güncellendi" : "Kayıt eklendi", type: "ok" });
    resetForm();
    await reload({ silent: true, force: true });
  }

  async function remove(row: Row) {
    if (!confirm(`${typeLabel(row.type)} kaydı silinsin mi?`)) return;
    const res = await fetch(`/api/suggestion-requests/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kayıt silinemedi", type: "error" });
      return;
    }
    setMessage({ text: "Kayıt silindi", type: "ok" });
    if (selectedId === row.id) setSelectedId(null);
    if (editingId === row.id) resetForm();
    await reload({ silent: true, force: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Genel"
        title="Öneri - Talep"
        description="Tüm kullanıcılar öneri veya talep ekleyebilir; düzenleme ve silme yalnızca ekleyen kişi veya admin tarafından yapılır."
      />

      {message ? (
        <div
          className={
            message.type === "error"
              ? "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              : "rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
          }
        >
          {message.text}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="panel-card p-5">
        <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-ink-900">
          {editingId ? "Kaydı Düzenle" : "Yeni Öneri / Talep"}
        </h2>
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label>Tür</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SuggestionRequestType })}>
              <option value="TALEP">Talep</option>
              <option value="ONERI">Öneri</option>
            </Select>
          </div>
          <div>
            <Label>Talebi / Öneriyi İleten</Label>
            <Input
              value={form.reporterName}
              onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
              required
            />
          </div>
          <div className="lg:col-span-2">
            <Label>Konu</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>
          <div className="lg:col-span-2">
            <Label>İçerik</Label>
            <Textarea
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="submit">
              <Save className="h-4 w-4" />
              {editingId ? "Güncelle" : "Ekle"}
            </Button>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                <X className="h-4 w-4" />
                Vazgeç
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="panel-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">
                Bildirimler
              </h2>
              <p className="text-xs text-slate-500">
                {refreshing ? "Güncelleniyor..." : `${rows.length} kayıt · ${dateRangePeriodLabel(range)}`}
              </p>
            </div>
            <DateRangePicker
              value={range}
              onChange={setRange}
              onRefresh={() => void reload({ silent: true, force: true })}
              refreshing={refreshing}
              align="end"
            />
          </div>
          <div className="divide-y divide-slate-100">
            {showSkeleton ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-5">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))
            ) : rows.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Henüz öneri veya talep yok.
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-brand-50/30 md:flex-row md:items-center md:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className="text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                        {typeLabel(row.type)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(row.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-900">{row.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Ekleyen: {row.createdByName ?? "-"} · İleten: {row.reporterName}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedId(row.id)}>
                      <Eye className="h-4 w-4" />
                      Detay
                    </Button>
                    {row.canModify ? (
                      <>
                        <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(row)}>
                          <Pencil className="h-4 w-4" />
                          Düzenle
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => void remove(row)}>
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="panel-card p-5">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">Detay</h2>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {typeLabel(selected.type)}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Konu</p>
                <p className="mt-1 font-semibold text-slate-900">{selected.subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">İleten</p>
                <p className="mt-1 text-slate-700">{selected.reporterName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">İçerik</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{selected.content}</p>
              </div>
              <div className="text-xs text-slate-500">
                Ekleyen: {selected.createdByName ?? "-"} · {new Date(selected.createdAt).toLocaleString("tr-TR")}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Detay görmek için bir kayıt seçin.</p>
          )}
        </aside>
      </section>
    </div>
  );
}