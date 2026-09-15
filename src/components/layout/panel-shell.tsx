"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { SessionUser } from "@/types/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { WelcomeTransition } from "@/components/layout/welcome-transition";
import { WELCOME_TRANSITION_KEY } from "@/lib/safe-redirect";
import { usePanelRevisionSync } from "@/hooks/use-panel-revision-sync";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { formatAppDateTimeShort } from "@/lib/timezone";

export function PanelShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");
  usePanelRevisionSync();
  useIdleLogout();

  const completeWelcome = useCallback(() => {
    setShowWelcome(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!showWelcome) return;

    const wasJustAuthenticated = window.sessionStorage.getItem(WELCOME_TRANSITION_KEY) === "1";
    window.sessionStorage.removeItem(WELCOME_TRANSITION_KEY);
    if (!wasJustAuthenticated) completeWelcome();
  }, [completeWelcome, showWelcome]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen bg-[var(--surface)]">
      {showWelcome ? (
        <WelcomeTransition userName={user.name} onComplete={completeWelcome} />
      ) : null}
      {navOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 h-screen transform transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          user={user}
          onNavigate={() => setNavOpen(false)}
          onClose={() => setNavOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 h-14 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-slate-700 lg:hidden"
                onClick={() => setNavOpen(true)}
                aria-label="Menüyü aç"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-ink-900">
                  Merhaba, {user.name.split(" ")[0]}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 font-mono text-[11px] text-slate-500 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {formatAppDateTimeShort(now)}
            </div>
          </div>
        </header>
        <main className="panel-shell-bg min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
