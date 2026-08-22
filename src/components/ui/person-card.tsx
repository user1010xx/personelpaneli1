import { cn } from "@/lib/utils";

export type PersonCardStat = {
  label: string;
  value: string | number;
};

type Props = {
  name: string;
  stats: PersonCardStat[];
  className?: string;
};

export function PersonCard({ name, stats, className }: Props) {
  return (
    <article className={cn("stat-3d panel-card p-5", className)}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-ink-900">{name}</p>
          <p className="kicker">Personel özeti</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-[#f6f7f4] px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{stat.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink-900">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toLocaleUpperCase("tr-TR");
}
