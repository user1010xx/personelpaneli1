import { cn } from "@/lib/utils";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ kicker, title, description, actions, className }: Props) {
  return (
    <header className={cn(className)}>
      {kicker ? <p className="kicker text-brand-700">{kicker}</p> : null}
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
          kicker && "mt-2",
        )}
      >
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-ink-900">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="mt-6 h-px w-full bg-gradient-to-r from-brand-500/55 via-[var(--border)] to-transparent" />
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-[var(--border)] px-5 py-4", className)}>
      <h2 className="font-display text-base font-semibold tracking-tight text-ink-900">{title}</h2>
      {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
    </div>
  );
}
