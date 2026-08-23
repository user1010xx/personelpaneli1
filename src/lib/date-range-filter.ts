import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { tr } from "date-fns/locale";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "this_month"
  | "last_3_months"
  | "custom";

export type DateRangeValue = {
  preset: DateRangePreset;
  from: string;
  to: string;
};

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Bugün" },
  { value: "yesterday", label: "Dün" },
  { value: "this_week", label: "Bu Hafta" },
  { value: "last_7_days", label: "Son 7 Gün" },
  { value: "this_month", label: "Bu Ay" },
  { value: "last_3_months", label: "Son 3 Ay" },
  { value: "custom", label: "Özel Tarih Aralığı" },
];

const PRESET_SET = new Set<string>(DATE_RANGE_PRESETS.map((item) => item.value));

export function isDateRangePreset(value: unknown): value is DateRangePreset {
  return typeof value === "string" && PRESET_SET.has(value);
}

export function toIsoDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatIsoDayTr(value: string) {
  const date = parseIsoDay(value);
  if (!date) return value;
  return format(date, "dd.MM.yyyy");
}

export function dateRangePresetLabel(preset: DateRangePreset) {
  return DATE_RANGE_PRESETS.find((item) => item.value === preset)?.label ?? "Bugün";
}

export function dateRangeButtonLabel(value: DateRangeValue) {
  if (value.preset === "custom") {
    if (value.from && value.to && value.from !== value.to) {
      return `${formatIsoDayTr(value.from)} - ${formatIsoDayTr(value.to)}`;
    }
    if (value.from) return formatIsoDayTr(value.from);
    return "Özel Tarih Aralığı";
  }
  return dateRangePresetLabel(value.preset);
}

export function dateRangePeriodLabel(value: DateRangeValue) {
  if (value.preset === "custom") return dateRangeButtonLabel(value);
  const preset = dateRangePresetLabel(value.preset);
  if (value.from && value.to && value.from !== value.to) {
    return `${preset} · ${formatIsoDayTr(value.from)} - ${formatIsoDayTr(value.to)}`;
  }
  return `${preset} · ${formatIsoDayTr(value.from)}`;
}

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
  now = new Date(),
): DateRangeValue {
  const today = startOfLocalDay(now);

  if (preset === "custom") {
    const from = parseIsoDay(customFrom) ?? today;
    const to = parseIsoDay(customTo) ?? from;
    const start = from.getTime() <= to.getTime() ? from : to;
    const end = from.getTime() <= to.getTime() ? to : from;
    return { preset: "custom", from: toIsoDay(start), to: toIsoDay(end) };
  }

  if (preset === "yesterday") {
    const day = subDays(today, 1);
    return { preset, from: toIsoDay(day), to: toIsoDay(day) };
  }

  if (preset === "this_week") {
    const from = startOfWeek(today, { weekStartsOn: 1 });
    return { preset, from: toIsoDay(from), to: toIsoDay(today) };
  }

  if (preset === "last_7_days") {
    return { preset, from: toIsoDay(subDays(today, 6)), to: toIsoDay(today) };
  }

  if (preset === "this_month") {
    return {
      preset,
      from: toIsoDay(startOfMonth(today)),
      to: toIsoDay(endOfMonth(today)),
    };
  }

  if (preset === "last_3_months") {
    return {
      preset,
      from: toIsoDay(startOfMonth(subMonths(today, 2))),
      to: toIsoDay(endOfMonth(today)),
    };
  }

  return { preset: "today", from: toIsoDay(today), to: toIsoDay(today) };
}

export function resolveDateRangeFromFilters(filters: {
  datePreset?: string | null;
  customFrom?: string;
  customTo?: string;
}) {
  const preset: DateRangePreset = isDateRangePreset(filters.datePreset)
    ? filters.datePreset
    : filters.customFrom || filters.customTo
      ? "custom"
      : "today";
  return resolveDateRange(preset, filters.customFrom, filters.customTo);
}

export function dateRangeFilterPatch(next: DateRangeValue) {
  return {
    datePreset: next.preset,
    customFrom: next.preset === "custom" ? next.from : "",
    customTo: next.preset === "custom" ? next.to : "",
  };
}

export function monthTitle(date: Date) {
  return format(date, "LLLL yyyy", { locale: tr });
}

export function shiftMonth(date: Date, delta: number) {
  return startOfMonth(addMonths(date, delta));
}
