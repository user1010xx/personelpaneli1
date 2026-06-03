"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  file: File | null;
  defaultFrom: string;
  defaultTo: string;
  uploading: boolean;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
};

function formatPeriodLabel(from: string, to: string) {
  if (!from || !to) return "";
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return "";
  if (from === to) {
    return format(fromDate, "d MMMM yyyy", { locale: tr });
  }
  return `${format(fromDate, "d MMMM yyyy", { locale: tr })} – ${format(toDate, "d MMMM yyyy", { locale: tr })}`;
}

export function ExcelUploadDialog({
  open,
  file,
  defaultFrom,
  defaultTo,
  uploading,
  onClose,
  onConfirm,
}: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  useEffect(() => {
    if (open) {
      setFrom(defaultFrom);
      setTo(defaultTo);
    }
  }, [open, defaultFrom, defaultTo]);

  if (!open || !file) return null;

  const periodLabel = formatPeriodLabel(from, to);
  const invalidRange = Boolean(from && to && from > to);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-upload-title"
    >
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-slate-200 bg-white p-6 shadow-panel-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="excel-upload-title" className="font-display text-lg font-bold text-slate-900">
              Veri dönemi seçin
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Excel satırları seçilen tarih aralığına kaydedilir. Aynı aralıktaki eski veri yenisiyle
              değiştirilir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {file.name}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Başlangıç tarihi</span>
            <div className="relative">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="pr-10"
                disabled={uploading}
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Bitiş tarihi</span>
            <div className="relative">
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="pr-10"
                disabled={uploading}
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        </div>

        {periodLabel ? (
          <p
            className={cn(
              "mt-4 rounded-xl border px-3 py-2 text-sm font-medium",
              invalidRange
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-brand-200 bg-brand-50 text-brand-900",
            )}
          >
            {invalidRange ? "Başlangıç tarihi bitişten sonra olamaz." : `Seçilen dönem: ${periodLabel}`}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-slate-500">
          Örnek: Mayıs ayının tamamı için 01.05 – 31.05; yalnızca 3 Haziran için her iki alana da
          03.06 yazın.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            className="flex-1"
            disabled={uploading || !from || !to || invalidRange}
            onClick={() => onConfirm(from, to)}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Yükleniyor…" : "Yükle"}
          </Button>
          <Button type="button" variant="secondary" disabled={uploading} onClick={onClose}>
            İptal
          </Button>
        </div>
      </div>
    </div>
  );
}
