"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Phone,
  Files,
  ScrollText,
  Shield,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_MODULES } from "@/lib/modules";
import { PanelLogo } from "@/components/ui/panel-logo";
import type { SessionUser } from "@/types/auth";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "calendar-clock": CalendarClock,
  "alert-triangle": AlertTriangle,
  "message-circle": MessageCircle,
  "graduation-cap": GraduationCap,
  star: Star,
  "user-plus": UserPlus,
  phone: Phone,
  files: Files,
  shield: Shield,
  "scroll-text": ScrollText,
  briefcase: BriefcaseBusiness,
} as const;

const NAV_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Genel", keys: ["DASHBOARD", "SUGGESTION_REQUEST"] },
  {
    label: "Operasyon Verisi",
    keys: ["PERSONEL", "PUANTAJ", "UYARI_KESINTI", "WHATSAPP", "UYE_ADEDI", "CAGRI_SURECI", "FILES"],
  },
  { label: "Kalite & Eğitim", keys: ["EGITIM", "KALITE", "INITIATIVE_WORK"] },
  { label: "Sistem", keys: ["USERS", "PERSONEL_ALIAS", "LOG"] },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const items = NAV_MODULES.filter((m) => m.source !== "admin" || user.role === "ADMIN");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[272px] shrink-0 flex-col bg-sidebar text-white shadow-sidebar lg:w-[280px]">
      <div className="border-b border-sidebar-border px-5 py-6">
        <div className="flex items-center gap-3">
          <PanelLogo size="md" />
          <div>
            <p className="font-display text-[15px] font-bold leading-tight">Çağrı Merkezi</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted">
              Operasyon Paneli
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((m) => group.keys.includes(m.key));
          if (groupItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-muted">
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
                        onMouseEnter={() => router.prefetch(item.href)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150",
                          active
                            ? "bg-gradient-to-r from-brand-600 to-brand-500 font-semibold text-white shadow-md shadow-black/20"
                            : "font-medium text-slate-300 hover:bg-sidebar-hover hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            active ? "text-white" : "text-slate-500 group-hover:text-slate-300",
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

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 rounded-xl border border-sidebar-border bg-sidebar-hover/80 p-3.5">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
          <span
            className={cn(
              "mt-2.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              user.role === "ADMIN"
                ? "bg-brand-500/20 text-brand-200"
                : "bg-slate-600/50 text-slate-300",
            )}
          >
            {user.role}
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-transparent px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-sidebar-hover hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
