"use client";

import type { Period } from "@/lib/date-ranges";
import { PERIOD_LABELS } from "@/lib/date-ranges";
import { cn } from "@/lib/utils";

type Props = {
  periodAverages?: { daily: number; weekly: number; monthly: number };
  stats?: {
    daily: { recordCount: number };
    weekly: { recordCount: number };
    monthly: { recordCount: number };
  };
  activePeriod: Period;
  onPeriodChange: (period: Period) => void;
};

export function QualityPeriodStats({
  periodAverages,
  stats,
  activePeriod,
  onPeriodChange,
}: Props) {
  const periods: Period[] = ["daily", "weekly", "monthly"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onPeriodChange(period)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all",
              activePeriod === period
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {periods.map((period) => {
          const ortalama = periodAverages?.[period] ?? 0;
          const kayit = stats?.[period]?.recordCount ?? 0;
          return (
            <div
              key={period}
              className={cn(
                "panel-card p-4 transition-all",
                activePeriod === period && "ring-2 ring-brand-500/20",
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {PERIOD_LABELS[period]} ortalama puan
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-700">{ortalama}</p>
              <p className="text-xs text-slate-500">{kayit} kayıt</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
