/** "10:30", "1:05:30" gibi süreleri saniyeye çevirir; düz sayıları olduğu gibi bırakır */
export function parseDurationOrNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;

  const text = value.trim();
  if (!text) return 0;

  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (timeMatch) {
    const h = Number(timeMatch[1]);
    const m = Number(timeMatch[2]);
    const s = timeMatch[3] ? Number(timeMatch[3]) : 0;
    return h * 3600 + m * 60 + s;
  }

  const normalized = text.replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const stripped = text.replace(/[^\d.-]/g, "");
  const num = Number(stripped);
  return Number.isFinite(num) ? num : 0;
}

export function findMetricInRow(
  row: Record<string, unknown>,
  keywords: string[],
  preferDuration = false,
) {
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLocaleLowerCase("tr-TR");
    if (!keywords.some((k) => normalized.includes(k))) continue;
    if (preferDuration) {
      return parseDurationOrNumber(value);
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const d = parseDurationOrNumber(value);
      if (d > 0) return d;
    }
  }
  return 0;
}
