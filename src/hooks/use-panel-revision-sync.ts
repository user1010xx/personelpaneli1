"use client";

import { useEffect, useRef } from "react";
import {
  invalidateModulesDataCaches,
} from "@/lib/panel-cache";

const POLL_MS = 120_000;

/**
 * Bir kullanıcı (admin veya user) veri güncellediğinde diğer oturumlar da
 * aynı DB revizyonunu görüp listeleri yeniler.
 */
export function usePanelRevisionSync() {
  const revisionRef = useRef<string | null>(null);
  const modulesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function checkRevision() {
      try {
        const res = await fetch("/api/panel/revision", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || !active) return;

        const json = (await res.json()) as { revision?: string; modules?: Record<string, string> };
        const next = json.revision ?? "";
        const prev = revisionRef.current;

        if (prev !== null && prev !== next) {
          const previousModules = modulesRef.current;
          const nextModules = json.modules ?? {};
          const changedModules = Array.from(
            new Set([...Object.keys(previousModules), ...Object.keys(nextModules)]),
          ).filter((key) => previousModules[key] !== nextModules[key]);
          invalidateModulesDataCaches(changedModules);
        }

        revisionRef.current = next;
        modulesRef.current = json.modules ?? {};
      } catch {
        /* ağ hatası — sonraki turda tekrar dene */
      }
    }

    void checkRevision();
    const timer = setInterval(() => void checkRevision(), POLL_MS);

    function onFocus() {
      void checkRevision();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void checkRevision();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
