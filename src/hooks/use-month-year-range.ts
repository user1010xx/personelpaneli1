"use client";

import { useMemo } from "react";
import {
  formatMonthYearLabel,
  monthYearToIsoRange,
  resolveMonthYear,
} from "@/lib/month-year";

type MonthYearFields = {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
};

export function useMonthYearRange<T extends MonthYearFields>(
  filters: T,
  patchFilters: (patch: Partial<T & { month: number; year: number }>) => void,
) {
  const { month, year } = useMemo(
    () => resolveMonthYear(filters),
    [filters.month, filters.year, filters.from, filters.to],
  );

  const { from, to } = useMemo(() => monthYearToIsoRange(month, year), [month, year]);

  const periodLabel = useMemo(() => formatMonthYearLabel(month, year), [month, year]);

  const setMonthYear = (nextMonth: number, nextYear: number) => {
    patchFilters({ month: nextMonth, year: nextYear } as Partial<T & { month: number; year: number }>);
  };

  return { month, year, from, to, periodLabel, setMonthYear };
}
