"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import type { ModuleKey } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type UploadItem = {
  id: string;
  fileName: string;
  rowCount: number;
  uploadedAt: string;
  periodFrom: string | null;
  periodTo: string | null;
  uploadedByName: string | null;
};

type Props = {
  moduleKey: ModuleKey;
  refreshKey?: number;
  onDeleted?: () => void;
};

function formatPeriod(from: string | null, to: string | null) {
  if (!from || !to) return "Dönem belirtilmemiş";
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime())) return "Dönem belirtilmemiş";
  if (from.slice(0, 10) === to.slice(0, 10)) {
    return format(fromDate, "d MMMM yyyy", { locale: tr });
  }
  return `${format(fromDate, "d MMMM yyyy", { locale: tr })} – ${format(toDate, "d MMMM yyyy", { locale: tr })}`;
}

export function ExcelUploadsPanel({ moduleKey, refreshKey = 0, onDeleted }: Props) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<UploadItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/excel/${moduleKey}/uploads`, { credentials: "include" });
      const json = (await res.json()) as { uploads?: UploadItem[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Yüklemeler listelenemedi");
        setUploads([]);
        return;
      }
      setUploads(json.uploads ?? []);
    } catch {
      setError("Bağlantı hatası");
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }, [moduleKey]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function executeDelete(item: UploadItem) {
    setDeletingId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/excel/${moduleKey}/uploads/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Silme başarısız");
        return;
      }
      setConfirmItem(null);
      onDeleted?.();
      await load();
    } catch {
      setError("Silme sırasında bağlantı hatası");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={confirmItem !== null}
        title="Dosyayı silmek istediğinize emin misiniz?"
        confirmLabel="Evet, sil"
        cancelLabel="Vazgeç"
        variant="danger"
        loading={deletingId !== null}
        onClose={() => {
          if (deletingId) return;
          setConfirmItem(null);
        }}
        onConfirm={() => {
          if (confirmItem) void executeDelete(confirmItem);
        }}
      >
        {confirmItem ? (
          <div className="space-y-3">
            <p>
              <span className="font-semibold text-slate-800">{confirmItem.fileName}</span> dosyası ve
              bağlı tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p>
                <span className="text-slate-500">Dönem:</span>{" "}
                <span className="font-medium text-slate-800">
                  {formatPeriod(confirmItem.periodFrom, confirmItem.periodTo)}
                </span>
              </p>
              <p className="mt-1">
                <span className="text-slate-500">Satır sayısı:</span>{" "}
                <span className="font-medium text-slate-800">{confirmItem.rowCount}</span>
              </p>
            </div>
          </div>
        ) : null}
      </ConfirmDialog>

      <section className="panel-card overflow-hidden">
        <div className="panel-card-header">
          <h2 className="text-sm font-bold text-slate-900">Yüklenen dosyalar</h2>
          <p className="text-xs text-slate-500">
            Hatalı tarih veya yanlış dosya yüklendiyse buradan dosyayı ve tüm satırlarını silebilirsiniz.
          </p>
        </div>

        {error ? (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-800">{error}</p>
        ) : null}

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Henüz kayıtlı Excel yüklemesi yok.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {uploads.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50/80"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{item.fileName}</p>
                    <p className="mt-0.5 text-xs font-medium text-brand-700">
                      {formatPeriod(item.periodFrom, item.periodTo)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.rowCount} satır ·{" "}
                      {new Date(item.uploadedAt).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.uploadedByName ? ` · ${item.uploadedByName}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={cn(
                    "shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800",
                  )}
                  disabled={deletingId !== null}
                  onClick={() => setConfirmItem(item)}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === item.id ? "Siliniyor…" : "Sil"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
