"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  LogOut,
  ScrollText,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_MODULES } from "@/lib/modules";
import { PanelLogo } from "@/components/ui/panel-logo";
import type { SessionUser } from "@/types/auth";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "graduation-cap": GraduationCap,
  "message-circle": MessageCircle,
  star: Headphones,
  shield: Shield,
  "scroll-text": ScrollText,
  briefcase: BriefcaseBusiness,
} as const;

const NAV_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Genel", keys: ["DASHBOARD", "SUGGESTION_REQUEST"] },
  { label: "Operasyon", keys: ["EGITIM", "CALL_FEEDBACK", "KALITE", "INITIATIVE_WORK"] },
  { label: "Sistem", keys: ["USERS", "LOG"] },
];

export function Sidebar({
  user,
  onNavigate,
  onClose,
}: {
  user: SessionUser;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items = NAV_MODULES.filter((m) => m.source !== "admin" || user.role === "ADMIN");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <aside className="relative flex h-full w-[248px] shrink-0 flex-col overflow-hidden bg-sidebar text-white">
      <div className="relative border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <PanelLogo size="md" className="ring-white/10" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold leading-tight">Çağrı Merkezi</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">
              Operasyon
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Menüyü kapat"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((m) => group.keys.includes(m.key));
          if (groupItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch
                        onClick={onNavigate}
                        onMouseEnter={() => router.prefetch(item.href)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition",
                          active
                            ? "bg-white/[0.07] font-semibold text-white"
                            : "font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-400" />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300",
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <div className="mb-3 rounded-xl bg-white/[0.04] px-3 py-3">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
          <span
            className={cn(
              "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              user.role === "ADMIN"
                ? "bg-brand-500/15 text-brand-200"
                : "bg-white/10 text-slate-300",
            )}
          >
            {user.role}
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
