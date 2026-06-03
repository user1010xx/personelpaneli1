"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dedupePanelRequest,
  eventAffectsPrefix,
  getPanelCache,
  invalidatePanelCache,
  isPanelCacheStale,
  PANEL_DATA_UPDATED_EVENT,
  panelCacheKey,
  setPanelCache,
} from "@/lib/panel-cache";

type Options = {
  debounceMs?: number;
  enabled?: boolean;
  refetchOnPanelUpdate?: boolean;
};

export function usePanelFetch<T>(
  url: string,
  params: URLSearchParams,
  options?: Options,
) {
  const debounceMs = options?.debounceMs ?? 0;
  const enabled = options?.enabled ?? true;
  const refetchOnPanelUpdate = options?.refetchOnPanelUpdate ?? true;
  const query = params.toString();
  const key = panelCacheKey(url, query);
  const cached = getPanelCache<T>(key);

  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      if (!enabled) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const hasData = getPanelCache<T>(key) !== null;
      if (!opts?.silent && !hasData) setLoading(true);
      else setRefreshing(true);

      try {
        const requestKey = opts?.force ? `${key}#force` : key;
        const json = await dedupePanelRequest(requestKey, async () => {
          const res = await fetch(query ? `${url}?${query}` : url, {
            credentials: "include",
            cache: opts?.force ? "no-store" : "default",
          });
          const payload = (await res.json()) as T & { error?: string };
          if (!res.ok) {
            throw new Error(payload.error ?? "Veri yüklenemedi");
          }
          return payload;
        });
        if (controller.signal.aborted) return;

        setError(null);
        setData(json);
        setPanelCache(key, json);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Bağlantı hatası — tekrar deneyin");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled, key, query, url],
  );

  useEffect(() => {
    if (!enabled) return;

    const hit = getPanelCache<T>(key);
    if (hit) {
      setData(hit);
      setLoading(false);
      if (isPanelCacheStale(key)) {
        void reload({ silent: true });
      }
      return;
    }

    setData(null);
    setLoading(true);
    const timer = setTimeout(() => void reload(), debounceMs);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [debounceMs, enabled, key, reload]);

  useEffect(() => {
    if (!enabled || !refetchOnPanelUpdate) return;
    const onUpdated = (event: Event) => {
      if (eventAffectsPrefix(event, url)) {
        void reload({ silent: true, force: true });
      }
    };
    window.addEventListener(PANEL_DATA_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PANEL_DATA_UPDATED_EVENT, onUpdated);
  }, [enabled, refetchOnPanelUpdate, reload, url]);

  const invalidate = useCallback(() => {
    invalidatePanelCache(url);
    void reload({ silent: false, force: true });
  }, [reload, url]);

  const hasData = data !== null;
  const showSkeleton = loading && !hasData;

  return {
    data,
    loading,
    refreshing,
    error,
    showSkeleton,
    reload,
    invalidate,
    setData,
  };
}
