"use client";

import type { SessionUser } from "@/types/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { usePanelRevisionSync } from "@/hooks/use-panel-revision-sync";

export function PanelShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  usePanelRevisionSync();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="panel-shell-bg min-h-screen flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1680px] animate-fade-in px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
