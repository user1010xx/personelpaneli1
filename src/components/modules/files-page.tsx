"use client";

import { useMemo, useState } from "react";
import type { ModuleKey } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";
import { usePanelFetch } from "@/hooks/use-panel-fetch";
import { invalidateModuleDataCaches } from "@/lib/panel-cache";

type Upload = {
  id: string;
  moduleKey: ModuleKey;
  fileName: string;
  rowCount: number;
  uploadedAt: string;
  periodFrom: string | null;
  periodTo: string | null;
  uploadedByName: string | null;
};

type UploadsResponse = {
  uploads: Upload[];
};

const MODULE_LABELS: Partial<Record<ModuleKey, string>> = {
  UYE_ADEDI: "Üye Adedi",
  CAGRI_SURECI: "Çağrı Süreci",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("tr-TR") : "-";
}

function periodLabel(upload: Upload) {
  if (!upload.periodFrom && !upload.periodTo) return "-";
  if (upload.periodFrom && upload.periodTo) {
    const from = formatDate(upload.periodFrom);
    const to = formatDate(upload.periodTo);
    return from === to ? from : `${from} - ${to}`;
  }
  return formatDate(upload.periodFrom ?? upload.periodTo);
}

export function FilesPage() {
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);
  const { data, error, refreshing, showSkeleton, reload } = usePanelFetch<UploadsResponse>(
    "/api/excel/uploads",
    new URLSearchParams(),
  );
  const { sortKey, sortDir, toggleSort, sort } = useClientTableSort<
    "uploadedAt" | "uploadedByName" | "fileName" | "moduleKey" | "rowCount"
  >("uploadedAt", "desc");

  const rows = useMemo(() => data?.uploads ?? [], [data?.uploads]);
  const sortedRows = useMemo(
    () =>
      sort(rows, (row, key) => {
        if (key === "uploadedAt") return row.uploadedAt;
        if (key === "moduleKey") return MODULE_LABELS[row.moduleKey] ?? row.moduleKey;
        return row[key as keyof Upload] ?? "";
      }),
    [rows, sort],
  );

  async function remove(upload: Upload) {
    if (!confirm(`${upload.fileName} dosyası ve ilişkili veriler silinsin mi?`)) return;
    const res = await fetch(`/api/excel/${upload.moduleKey}/uploads/${upload.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Dosya silinemedi", type: "error" });
      return;
    }
    setMessage({ text: "Dosya ve ilişkili veriler silindi", type: "ok" });
    invalidateModuleDataCaches(upload.moduleKey);
    await reload({ silent: true, force: true });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dosyalar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Üye Adedi ve Çağrı Süreci için yüklenen Excel dosyalarını buradan yönetin.
        </p>
      </div>

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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Yüklenen Dosyalar</h2>
            <p className="text-xs text-slate-500">
              {refreshing ? "Güncelleniyor..." : `${rows.length} dosya`}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void reload({ silent: true, force: true })}>
            Yenile
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <SortableTh
                  label="Tarih"
                  sortKey="uploadedAt"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-5 py-3.5"
                />
                <SortableTh
                  label="Yükleyen"
                  sortKey="uploadedByName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-5 py-3.5"
                />
                <SortableTh
                  label="Dosya Adı"
                  sortKey="fileName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-5 py-3.5"
                />
                <SortableTh
                  label="Başlık"
                  sortKey="moduleKey"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-5 py-3.5"
                />
                <SortableTh
                  label="Satır"
                  sortKey="rowCount"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-5 py-3.5"
                  align="right"
                />
                <th className="px-5 py-3.5 text-left">Dönem</th>
                <th className="px-5 py-3.5 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="px-5 py-3">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Henüz yüklenmiş dosya yok.
                  </td>
                </tr>
              ) : (
                sortedRows.map((upload) => (
                  <tr key={upload.id} className="transition hover:bg-brand-50/30">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                      {new Date(upload.uploadedAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{upload.uploadedByName ?? "-"}</td>
                    <td className="max-w-[320px] truncate px-5 py-3.5 font-medium text-slate-900">
                      {upload.fileName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {MODULE_LABELS[upload.moduleKey] ?? upload.moduleKey}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{upload.rowCount}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                      {periodLabel(upload)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Button type="button" size="sm" variant="danger" onClick={() => void remove(upload)}>
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </Button>
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