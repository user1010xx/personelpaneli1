"use client";

import { useEffect, useRef } from "react";
import {
  invalidateDataCaches,
  PANEL_DATA_UPDATED_EVENT,
} from "@/lib/panel-cache";

const POLL_MS = 30_000;

/**
 * Bir kullanıcı (admin veya user) veri güncellediğinde diğer oturumlar da
 * aynı DB revizyonunu görüp listeleri yeniler.
 */
export function usePanelRevisionSync() {
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkRevision() {
      try {
        const res = await fetch("/api/panel/revision", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || !active) return;

        const json = (await res.json()) as { revision?: string };
        const next = json.revision ?? "";
        const prev = revisionRef.current;

        if (prev !== null && prev !== next) {
          invalidateDataCaches();
          window.dispatchEvent(new CustomEvent(PANEL_DATA_UPDATED_EVENT));
        }

        revisionRef.current = next;
      } catch {
        /* ağ hatası — sonraki turda tekrar dene */
      }
    }

    void checkRevision();
    const timer = setInterval(() => void checkRevision(), POLL_MS);

    function onFocus() {
      void checkRevision();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void checkRevision();
    });

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
