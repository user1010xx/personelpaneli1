"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  DATE_RANGE_PRESETS,
  dateRangeButtonLabel,
  monthTitle,
  parseIsoDay,
  resolveDateRange,
  shiftMonth,
  toIsoDay,
  type DateRangePreset,
  type DateRangeValue,
} from "@/lib/date-range-filter";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  align?: "start" | "end";
  className?: string;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const startWeekday = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MonthCalendar({
  month,
  onPrev,
  onNext,
  rangeFrom,
  rangeTo,
  hoverDay,
  onDayClick,
  onDayHover,
}: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  rangeFrom: string | null;
  rangeTo: string | null;
  hoverDay: string | null;
  onDayClick: (iso: string) => void;
  onDayHover: (iso: string | null) => void;
}) {
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const from = rangeFrom;
  const to = rangeTo ?? hoverDay ?? rangeFrom;
  const start = from && to && from > to ? to : from;
  const end = from && to && from > to ? from : to;

  return (
    <div className="w-[252px]">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Önceki ay"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-slate-800">{monthTitle(month)}</p>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Sonraki ay"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, index) => {
          if (!date) {
            return <span key={`e-${index}`} className="h-9" />;
          }
          const iso = toIsoDay(date);
          const inRange = Boolean(start && end && iso >= start && iso <= end);
          const isStart = iso === start;
          const isEnd = iso === end;
          const isEdge = isStart || isEnd;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onDayClick(iso)}
              onMouseEnter={() => onDayHover(iso)}
              onMouseLeave={() => onDayHover(null)}
              className={cn(
                "relative flex h-9 items-center justify-center text-sm",
                inRange && !isEdge && "bg-blue-50 text-slate-800",
                isStart && end && start !== end && "rounded-l-full bg-blue-50",
                isEnd && start && start !== end && "rounded-r-full bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isEdge && "bg-blue-600 font-semibold text-white",
                  !isEdge && "hover:bg-slate-100",
                )}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  onRefresh,
  refreshing,
  align = "start",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showCalendars, setShowCalendars] = useState(value.preset === "custom");
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState<string | null>(value.preset === "custom" ? value.to : null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(parseIsoDay(value.from) ?? new Date()));
  const [rightMonth, setRightMonth] = useState(() => {
    const end = parseIsoDay(value.to) ?? new Date();
    const start = parseIsoDay(value.from) ?? end;
    const next = startOfMonth(end);
    if (next.getTime() === startOfMonth(start).getTime()) return next;
    return next;
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setShowCalendars(value.preset === "custom");
      setDraftFrom(value.from);
      setDraftTo(value.preset === "custom" ? value.to : null);
      setHoverDay(null);
    }
  }, [open, value.from, value.preset, value.to]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function applyPreset(preset: DateRangePreset) {
    if (preset === "custom") {
      setShowCalendars(true);
      setDraftFrom(value.from);
      setDraftTo(value.to);
      return;
    }
    onChange(resolveDateRange(preset));
    setOpen(false);
  }

  function pickDay(iso: string) {
    if (!draftFrom || draftTo) {
      setDraftFrom(iso);
      setDraftTo(null);
      setHoverDay(null);
      return;
    }
    const from = draftFrom <= iso ? draftFrom : iso;
    const to = draftFrom <= iso ? iso : draftFrom;
    setDraftTo(to);
    onChange({ preset: "custom", from, to });
    setOpen(false);
  }

  const label = dateRangeButtonLabel(value);

  return (
    <div ref={rootRef} className={cn("relative inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3.5 text-sm font-medium text-slate-800 shadow-sm transition",
          open
            ? "border-slate-900 ring-1 ring-slate-900"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        )}
      >
        <CalendarDays className="h-4 w-4 text-slate-500" />
        {label}
      </button>

      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          aria-label="Yenile"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      ) : null}

      {open ? (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel-lg md:flex-row",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {showCalendars ? (
            <div className="flex flex-col gap-6 border-b border-slate-100 p-4 md:flex-row md:border-b-0 md:border-r">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Başlangıç</p>
                <MonthCalendar
                  month={leftMonth}
                  onPrev={() => setLeftMonth((current) => shiftMonth(current, -1))}
                  onNext={() => setLeftMonth((current) => shiftMonth(current, 1))}
                  rangeFrom={draftFrom}
                  rangeTo={draftTo}
                  hoverDay={hoverDay}
                  onDayClick={pickDay}
                  onDayHover={setHoverDay}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Bitiş</p>
                <MonthCalendar
                  month={rightMonth}
                  onPrev={() => setRightMonth((current) => shiftMonth(current, -1))}
                  onNext={() => setRightMonth((current) => shiftMonth(current, 1))}
                  rangeFrom={draftFrom}
                  rangeTo={draftTo}
                  hoverDay={hoverDay}
                  onDayClick={pickDay}
                  onDayHover={setHoverDay}
                />
              </div>
            </div>
          ) : null}

          <div className="min-w-[220px] py-1.5">
            {DATE_RANGE_PRESETS.map((item) => {
              const active = value.preset === item.value;
              const isCustom = item.value === "custom";
              return (
                <button
                  key={item.value}
                  type="button"
                  onMouseEnter={() => setShowCalendars(isCustom)}
                  onClick={() => applyPreset(item.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition",
                    active ? "bg-blue-50 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span>{item.label}</span>
                  {isCustom ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
