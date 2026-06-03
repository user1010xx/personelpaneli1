"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortDir } from "@/lib/table-sort";
import { nextSortDir, sortRows } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

export function TableSortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 shrink-0 opacity-45" aria-hidden />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
  );
}

type SortableThProps = {
  label: string;
  sortKey: string;
  activeKey: string | null;
  dir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
};

export function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
  align = "left",
}: SortableThProps) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 text-inherit transition hover:text-slate-900",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
        title="Sırala"
      >
        <span>{label}</span>
        <TableSortIcon active={activeKey === sortKey} dir={dir} />
      </button>
    </th>
  );
}

export function useClientTableSort<T extends string>(
  defaultKey: T,
  defaultDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState<T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggleSort = useCallback((key: T) => {
    setSortDir((dir) => nextSortDir(sortKey, key, dir));
    setSortKey(key);
  }, [sortKey]);

  const sort = useCallback(
    <R,>(rows: R[], getValue?: (row: R, key: string) => unknown) =>
      sortRows(rows, sortKey, sortDir, getValue),
    [sortDir, sortKey],
  );

  return { sortKey, sortDir, toggleSort, sort, setSortKey, setSortDir };
}
