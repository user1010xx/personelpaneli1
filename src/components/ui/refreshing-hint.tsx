import { Loader2 } from "lucide-react";

export function RefreshingHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-brand-200/80 bg-brand-50/80 px-4 py-2.5 text-sm font-medium text-brand-800"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      Veriler güncelleniyor…
    </div>
  );
}
