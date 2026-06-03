"use client";

import { BarChart3, Users } from "lucide-react";
import type { Period } from "@/lib/date-ranges";
import { PERIOD_LABELS } from "@/lib/date-ranges";
import type { ModuleStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

type Props = {
  stats?: {
    daily: ModuleStats;
    weekly: ModuleStats;
    monthly: ModuleStats;
    active: ModuleStats;
  };
  activePeriod: Period;
  onPeriodChange: (period: Period) => void;
  /** Personel modülünde toplam liste + dönem içi işe giriş ayrımı */
  variant?: "default" | "personel";
};

export function PeriodStatsBar({
  stats,
  activePeriod,
  onPeriodChange,
  variant = "default",
}: Props) {
  const periods: Period[] = ["daily", "weekly", "monthly"];
  const isPersonel = variant === "personel";
  const totalPersonel =
    stats?.daily.totalPersonelCount ??
    stats?.weekly.totalPersonelCount ??
    stats?.monthly.totalPersonelCount ??
    0;
  const recordLabel = isPersonel ? "işe giriş (dönem içi)" : "toplam kayıt";
  const personelHint = isPersonel
    ? "Kayıt listesi tüm personeli gösterir. Dönem kartları işe giriş tarihine göre özetlenir."
    : null;

  return (
    <div className="space-y-5">
      {isPersonel ? (
        <div className="stat-card stat-card-active border-brand-200 bg-gradient-to-br from-brand-50/80 to-white">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
              Toplam personel sayısı
            </p>
            <Users className="h-4 w-4 text-brand-500" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold tabular-nums text-slate-900">
            {totalPersonel}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Google Sheets personel listesindeki tüm kayıtlar
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Dönem özeti</p>
          {personelHint ? (
            <p className="mt-0.5 text-xs text-slate-500">{personelHint}</p>
          ) : null}
        </div>
        <div className="segmented-control" role="tablist">
          {periods.map((period) => (
            <button
              key={period}
              type="button"
              role="tab"
              aria-selected={activePeriod === period}
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {periods.map((period) => {
          const data = stats?.[period];
          const isActive = activePeriod === period;
          return (
            <div
              key={period}
              className={cn("stat-card", isActive && "stat-card-active")}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {PERIOD_LABELS[period]}
                </p>
                <BarChart3 className="h-4 w-4 text-slate-300" />
              </div>
              <p className="mt-3 font-display text-4xl font-bold tabular-nums text-slate-900">
                {data?.recordCount ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">{recordLabel}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <Users className="h-4 w-4 text-brand-500" />
                <span>
                  <span className="font-bold text-slate-900">{data?.uniquePersonel ?? 0}</span>{" "}
                  {isPersonel ? "personel (dönem içi)" : "personel"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
