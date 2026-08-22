import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  imageSrc?: string;
  tone?: "blue" | "violet" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
};

const TONE_BAR: Record<NonNullable<Props["tone"]>, string> = {
  blue: "bg-brand-500",
  violet: "bg-teal-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
  className,
}: Props) {
  return (
    <article className={cn("stat-3d relative overflow-hidden p-5", "panel-card", className)}>
      <span className={cn("absolute bottom-4 left-0 top-4 w-[3px] rounded-full", TONE_BAR[tone])} />
      <p className="kicker pl-3">{label}</p>
      <p className="mt-3 pl-3 font-display text-[1.85rem] font-semibold leading-none tabular-nums tracking-tight text-ink-900">
        {value}
      </p>
      {hint ? <p className="mt-2 pl-3 text-xs font-medium text-slate-500">{hint}</p> : null}
    </article>
  );
}
