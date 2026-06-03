"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Period } from "@/lib/date-ranges";
import type { ModuleStats } from "@/lib/stats";
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

type ModulePayload = {
  rows: unknown[];
  total: number;
  stats?: {
    daily: ModuleStats;
    weekly: ModuleStats;
    monthly: ModuleStats;
    active: ModuleStats;
  };
  statsTruncated?: boolean;
};

type LoadPhase = "rows" | "stats" | "full";

function buildFetchQuery(baseQuery: string, phase: LoadPhase) {
  const params = new URLSearchParams(baseQuery);
  if (phase === "stats") {
    params.set("statsOnly", "1");
    params.delete("includeStats");
  } else if (phase === "rows") {
    params.set("includeStats", "0");
    params.delete("statsOnly");
  } else {
    params.delete("includeStats");
    params.delete("statsOnly");
  }
  return params.toString();
}

function statsCacheKey(key: string) {
  return `${key}#stats`;
}

export function useModuleData(apiPath: string, params: URLSearchParams) {
  const query = params.toString();
  const key = panelCacheKey(apiPath, query);
  const cached = getPanelCache<ModulePayload>(key);

  const [rows, setRows] = useState<unknown[]>(cached?.rows ?? []);
  const [total, setTotal] = useState(cached?.total ?? 0);
  const [stats, setStats] = useState(cached?.stats);
  const [statsTruncated, setStatsTruncated] = useState(cached?.statsTruncated ?? false);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const statsAbortRef = useRef<AbortController | null>(null);

  const applyPayload = useCallback(
    (json: ModulePayload, merge = false) => {
      if (merge) {
        setStats(json.stats);
        setStatsTruncated(Boolean(json.statsTruncated));
        const prev = getPanelCache<ModulePayload>(key);
        if (prev) {
          setPanelCache(key, {
            ...prev,
            stats: json.stats,
            statsTruncated: json.statsTruncated,
          });
        } else {
          setPanelCache(statsCacheKey(key), {
            rows: [],
            total: 0,
            stats: json.stats,
            statsTruncated: json.statsTruncated,
          });
        }
      } else {
        setRows(json.rows ?? []);
        setTotal(json.total ?? 0);
        if (json.stats) {
          setStats(json.stats);
          setStatsTruncated(Boolean(json.statsTruncated));
        }
        const prev = getPanelCache<ModulePayload>(key);
        const cachedStats = getPanelCache<ModulePayload>(statsCacheKey(key));
        setPanelCache(key, {
          rows: json.rows ?? [],
          total: json.total ?? 0,
          stats: json.stats ?? prev?.stats ?? cachedStats?.stats,
          statsTruncated:
            json.statsTruncated ?? prev?.statsTruncated ?? cachedStats?.statsTruncated,
        });
      }
      setError(null);
    },
    [key],
  );

  const loadStats = useCallback(
    async (opts?: { silent?: boolean }) => {
      statsAbortRef.current?.abort();
      const controller = new AbortController();
      statsAbortRef.current = controller;

      if (!opts?.silent) setRefreshing(true);

      try {
        const statsQuery = buildFetchQuery(query, "stats");
        const requestKey = panelCacheKey(apiPath, statsQuery);
        const json = await dedupePanelRequest(requestKey, async () => {
          const res = await fetch(statsQuery ? `${apiPath}?${statsQuery}` : apiPath, {
            credentials: "include",
          });
          const payload = (await res.json()) as ModulePayload & { error?: string };
          if (!res.ok) {
            throw new Error(payload.error ?? "İstatistikler yüklenemedi");
          }
          return payload;
        });
        if (controller.signal.aborted) return;

        applyPayload(json, true);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!opts?.silent) {
          setError(error instanceof Error ? error.message : "İstatistikler yüklenemedi");
        }
      } finally {
        if (!controller.signal.aborted && !opts?.silent) {
          setRefreshing(false);
        }
      }
    },
    [apiPath, applyPayload, query],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean; withStats?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const hasData = getPanelCache<ModulePayload>(key) !== null;
      if (!opts?.silent && !hasData) setLoading(true);
      else if (!opts?.silent) setRefreshing(true);

      const phase: LoadPhase = opts?.withStats ? "full" : "rows";
      const fetchQuery = buildFetchQuery(query, phase);
      const fetchStatsInParallel = phase === "rows" && !opts?.withStats;
      if (fetchStatsInParallel) {
        void loadStats({ silent: true });
      }

      try {
        const requestKey = panelCacheKey(apiPath, fetchQuery);
        const json = await dedupePanelRequest(requestKey, async () => {
          const res = await fetch(fetchQuery ? `${apiPath}?${fetchQuery}` : apiPath, {
            credentials: "include",
          });
          const payload = (await res.json()) as ModulePayload & { error?: string };
          if (!res.ok) {
            throw new Error(payload.error ?? "Veri yüklenemedi");
          }
          return payload;
        });
        if (controller.signal.aborted) return;

        applyPayload(json);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Bağlantı hatası");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [apiPath, applyPayload, key, loadStats, query],
  );

  useEffect(() => {
    const hit = getPanelCache<ModulePayload>(key);
    if (hit) {
      applyPayload(hit);
      setLoading(false);
      if (isPanelCacheStale(key)) {
        void load({ silent: true });
      } else if (!hit.stats) {
        void loadStats({ silent: true });
      }
      return;
    }

    void load();
    return () => {
      abortRef.current?.abort();
      statsAbortRef.current?.abort();
    };
  }, [applyPayload, key, load, loadStats]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      if (eventAffectsPrefix(event, apiPath)) {
        void load({ silent: true, withStats: true });
      }
    };
    window.addEventListener(PANEL_DATA_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PANEL_DATA_UPDATED_EVENT, onUpdated);
  }, [apiPath, load]);

  const invalidate = useCallback(() => {
    invalidatePanelCache(apiPath);
    void load({ silent: false, withStats: true });
  }, [apiPath, load]);

  return {
    rows,
    total,
    stats,
    statsTruncated,
    loading,
    refreshing,
    error,
    reload: load,
    invalidate,
  };
}

export type { Period };
