"use client";

import { ArrowDownAZ, ArrowUpAZ, Search } from "lucide-react";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Input } from "@/components/ui/input";

type SortOption = { value: string; label: string };

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  month: number;
  year: number;
  onMonthYearChange: (month: number, year: number) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: "asc" | "desc") => void;
  sortOptions?: SortOption[];
  hideDateRange?: boolean;
};

export function DataFilters({
  search,
  onSearchChange,
  month,
  year,
  onMonthYearChange,
  sortBy,
  sortDir,
  onSortByChange,
  onSortDirChange,
  sortOptions,
  hideDateRange = false,
}: Props) {
  const sortChoices = sortOptions ?? [
    { value: "date", label: "Tarihe göre" },
    { value: "personel", label: "Personele göre" },
  ];
  return (
    <div className="filter-toolbar">
      {!hideDateRange ? (
        <div className="filter-field min-w-[220px]">
          <MonthYearPicker
            month={month}
            year={year}
            onChange={onMonthYearChange}
            compact
          />
        </div>
      ) : null}

      <div className="filter-field min-w-[200px] flex-[2]">
        <span className="filter-label">Arama</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Personel veya veri ara…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-field min-w-[160px]">
        <span className="filter-label">Sıralama</span>
        <select
          className="panel-input"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
        >
          {sortChoices.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field min-w-[140px]">
        <span className="filter-label">Yön</span>
        <select
          className="panel-input"
          value={sortDir}
          onChange={(e) => onSortDirChange(e.target.value as "asc" | "desc")}
        >
          <option value="desc">Azalan</option>
          <option value="asc">Artan</option>
        </select>
      </div>

      <div className="hidden items-center gap-1 text-slate-400 lg:flex lg:pb-2">
        {sortDir === "asc" ? (
          <ArrowUpAZ className="h-4 w-4" />
        ) : (
          <ArrowDownAZ className="h-4 w-4" />
        )}
      </div>
    </div>
  );
}
