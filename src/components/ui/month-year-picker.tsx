"use client";

import { Calendar } from "lucide-react";
import {
  formatMonthYearLabel,
  MONTH_OPTIONS,
  yearOptions,
} from "@/lib/month-year";
import { cn } from "@/lib/utils";

type Props = {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
  compact?: boolean;
};

export function MonthYearPicker({ month, year, onChange, className, compact }: Props) {
  const years = yearOptions();
  const label = formatMonthYearLabel(month, year);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[#f7f8f6] px-3 py-1.5 text-sm font-semibold text-ink-900",
            compact && "text-xs",
          )}
        >
          <Calendar className="h-4 w-4 shrink-0 text-brand-700" />
          {label}
        </span>
      </div>
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
        <label className="block">
          <span className="filter-label">Ay</span>
          <select
            className="panel-input w-full"
            value={month}
            onChange={(e) => onChange(Number(e.target.value), year)}
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="filter-label">Yıl</span>
          <select
            className="panel-input w-full"
            value={year}
            onChange={(e) => onChange(month, Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
