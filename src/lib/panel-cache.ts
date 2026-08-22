type CacheEntry = {
  data: unknown;
  ts: number;
  stale: boolean;
};

export const PANEL_DATA_UPDATED_EVENT = "panel-data-updated";

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function panelCacheKey(url: string, query: string) {
  return query ? `${url}?${query}` : url;
}

export function getPanelCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function isPanelCacheStale(key: string) {
  const entry = store.get(key);
  return Boolean(entry?.stale);
}

export function setPanelCache(key: string, data: unknown) {
  store.set(key, { data, ts: Date.now(), stale: false });
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

export function markPanelCacheStale(urlPrefix: string) {
  for (const [key, entry] of store.entries()) {
    if (key.startsWith(urlPrefix)) {
      store.set(key, { ...entry, stale: true });
    }
  }
}

export function affectedPrefixesForModule(moduleKey: string) {
  switch (moduleKey) {
    case "KALITE":
      return ["/api/quality", "/api/dashboard"];
    case "EGITIM":
      return ["/api/training", "/api/dashboard"];
    case "CALL_FEEDBACK":
      return ["/api/call-feedback", "/api/dashboard"];
    case "INITIATIVE_WORK":
      return ["/api/initiative-work", "/api/dashboard"];
    case "SUGGESTION_REQUEST":
      return ["/api/suggestion-requests"];
    default:
      return [];
  }
}

export function dispatchPanelDataUpdated(prefixes: string[]) {
  const uniquePrefixes = Array.from(new Set(prefixes));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PANEL_DATA_UPDATED_EVENT, {
        detail: { prefixes: uniquePrefixes },
      }),
    );
  }
}

export function invalidatePrefixes(prefixes: string[]) {
  const uniquePrefixes = Array.from(new Set(prefixes));
  for (const prefix of uniquePrefixes) {
    markPanelCacheStale(prefix);
  }
  dispatchPanelDataUpdated(uniquePrefixes);
}

export function invalidateModuleDataCaches(moduleKey: string) {
  invalidatePrefixes(affectedPrefixesForModule(moduleKey));
}

export function invalidateModulesDataCaches(moduleKeys: string[]) {
  invalidatePrefixes(moduleKeys.flatMap(affectedPrefixesForModule));
}

export function invalidateDataCaches() {
  invalidatePrefixes([
    "/api/dashboard",
    "/api/training",
    "/api/call-feedback",
    "/api/quality",
    "/api/initiative-work",
    "/api/suggestion-requests",
  ]);
}

export function eventAffectsPrefix(event: Event, prefix: string) {
  const detail = (event as CustomEvent<{ prefixes?: string[] }>).detail;
  const prefixes = detail?.prefixes;
  if (!prefixes?.length) return true;
  return prefixes.some((item) => prefix.startsWith(item) || item.startsWith(prefix));
}

export async function dedupePanelRequest<T>(key: string, request: () => Promise<T>) {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = request().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
