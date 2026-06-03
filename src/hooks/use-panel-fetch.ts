"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPanelCache,
  getPanelCacheAge,
  invalidatePanelCache,
  PANEL_DATA_UPDATED_EVENT,
  PANEL_STALE_REVALIDATE_MS,
  panelCacheKey,
  setPanelCache,
} from "@/lib/panel-cache";

const STALE_REVALIDATE_MS = PANEL_STALE_REVALIDATE_MS;

type Options = {
  debounceMs?: number;
  enabled?: boolean;
};

export function usePanelFetch<T>(
  url: string,
  params: URLSearchParams,
  options?: Options,
) {
  const debounceMs = options?.debounceMs ?? 0;
  const enabled = options?.enabled ?? true;
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
        const res = await fetch(query ? `${url}?${query}` : url, {
          signal: controller.signal,
          credentials: "include",
          cache: opts?.force ? "no-store" : "default",
        });
        const json = (await res.json()) as T & { error?: string };
        if (controller.signal.aborted) return;

        if (!res.ok) {
          setError(json.error ?? "Veri yüklenemedi");
          return;
        }

        setError(null);
        setData(json);
        setPanelCache(key, json);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Bağlantı hatası — tekrar deneyin");
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
      const age = getPanelCacheAge(key);
      if (age !== null && age > STALE_REVALIDATE_MS) {
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
    if (!enabled) return;
    const onUpdated = () => void reload({ silent: true, force: true });
    window.addEventListener(PANEL_DATA_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PANEL_DATA_UPDATED_EVENT, onUpdated);
  }, [enabled, reload]);

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
