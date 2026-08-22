"use client";

import type { Period } from "@/lib/date-ranges";
import { PERIOD_LABELS } from "@/lib/date-ranges";
import type { TrainingPeriodCounts } from "@/lib/training";
import { cn } from "@/lib/utils";

type Props = {
  periodCounts?: {
    daily: TrainingPeriodCounts;
    weekly: TrainingPeriodCounts;
    monthly: TrainingPeriodCounts;
  };
  activePeriod: Period;
  onPeriodChange: (period: Period) => void;
  mode?: "split" | "simple";
};

export function TrainingPeriodStats({
  periodCounts,
  activePeriod,
  onPeriodChange,
  mode = "split",
}: Props) {
  const periods: Period[] = ["daily", "weekly", "monthly"];

  return (
    <div className="space-y-4">
      <div className="segmented-control">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onPeriodChange(period)}
            className={cn(
              "segmented-item",
              activePeriod === period && "segmented-item-active",
            )}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {periods.map((period) => {
          const data = periodCounts?.[period];
          return (
            <div
              key={period}
              className={cn(
                "panel-card p-4 transition-all",
                activePeriod === period && "ring-1 ring-brand-500/25",
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {PERIOD_LABELS[period]} özet
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-700">{data?.toplam ?? 0}</p>
              <p className="text-xs text-slate-500">toplam kayıt</p>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {mode === "split" ? (
                  <>
                    <p>
                      Eğitim: <span className="font-semibold text-brand-800">{data?.egitim ?? 0}</span>
                    </p>
                    <p>
                      Geribildirim:{" "}
                      <span className="font-semibold text-teal-800">{data?.geribildirim ?? 0}</span>
                    </p>
                  </>
                ) : null}
                <p>
                  Personel: <span className="font-semibold text-slate-800">{data?.personel ?? 0}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
