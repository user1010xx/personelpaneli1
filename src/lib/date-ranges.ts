import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type Period = "daily" | "weekly" | "monthly";

export function getPeriodRange(period: Period, anchor = new Date()) {
  const day = startOfDay(anchor);
  if (period === "daily") {
    return { from: day, to: endOfDay(anchor) };
  }
  if (period === "weekly") {
    return {
      from: startOfWeek(anchor, { weekStartsOn: 1 }),
      to: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};
