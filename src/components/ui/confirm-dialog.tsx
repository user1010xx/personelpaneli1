"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  loading = false,
  variant = "default",
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md animate-fade-in rounded-xl border border-[var(--border)] bg-white p-6 shadow-panel-lg">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              variant === "danger" ? "bg-rose-100 text-rose-600" : "bg-brand-100 text-brand-600",
            )}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="confirm-dialog-title" className="mt-4 font-display text-lg font-bold text-slate-900">
          {title}
        </h2>
        {children ? <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            className="flex-1"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "İşleniyor…" : confirmLabel}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" disabled={loading} onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
