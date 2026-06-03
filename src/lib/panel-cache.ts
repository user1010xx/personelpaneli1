type CacheEntry = {
  data: unknown;
  ts: number;
};

export const PANEL_DATA_UPDATED_EVENT = "panel-data-updated";

const store = new Map<string, CacheEntry>();

export const PANEL_CACHE_TTL_MS = 90_000;
/** Cache hit sonrası arka planda yenileme eşiği */
export const PANEL_STALE_REVALIDATE_MS = 60_000;

export function panelCacheKey(url: string, query: string) {
  return query ? `${url}?${query}` : url;
}

export function getPanelCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > PANEL_CACHE_TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function getPanelCacheAge(key: string): number | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > PANEL_CACHE_TTL_MS) {
    store.delete(key);
    return null;
  }
  return Date.now() - entry.ts;
}

export function setPanelCache(key: string, data: unknown) {
  store.set(key, { data, ts: Date.now() });
}

export function invalidatePanelCache(urlPrefix?: string) {
  if (!urlPrefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(urlPrefix)) store.delete(key);
  }
}

/** Call after any mutation that affects dashboard aggregates */
export function invalidateDataCaches() {
  for (const prefix of [
    "/api/dashboard",
    "/api/training",
    "/api/quality",
    "/api/data/",
  ]) {
    invalidatePanelCache(prefix);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PANEL_DATA_UPDATED_EVENT));
  }
}
