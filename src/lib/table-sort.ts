export type SortDir = "asc" | "desc";

export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  const da = a instanceof Date ? a : typeof a === "string" ? tryParseDate(a) : null;
  const db = b instanceof Date ? b : typeof b === "string" ? tryParseDate(b) : null;
  if (da && db) return da.getTime() - db.getTime();

  const na = Number(String(a).replace(",", "."));
  const nb = Number(String(b).replace(",", "."));
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;

  return String(a).localeCompare(String(b), "tr", { sensitivity: "base" });
}

function tryParseDate(value: string) {
  const iso = Date.parse(value);
  if (Number.isFinite(iso)) return new Date(iso);
  const tr = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(value.trim());
  if (tr) {
    const d = new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function sortRows<T>(
  rows: T[],
  sortKey: string,
  sortDir: SortDir,
  getValue?: (row: T, key: string) => unknown,
): T[] {
  const list = [...rows];
  list.sort((a, b) => {
    const va = getValue ? getValue(a, sortKey) : (a as Record<string, unknown>)[sortKey];
    const vb = getValue ? getValue(b, sortKey) : (b as Record<string, unknown>)[sortKey];
    const cmp = compareValues(va, vb);
    return sortDir === "asc" ? cmp : -cmp;
  });
  return list;
}

export function nextSortDir(currentKey: string, nextKey: string, currentDir: SortDir): SortDir {
  if (currentKey === nextKey) return currentDir === "asc" ? "desc" : "asc";
  return "asc";
}
