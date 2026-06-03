const EXCLUDED_KEY =
  /^(id|telefon|phone|mail|e-?mail|kullanici|kullanıcı|referans|username|sıra|sira|no)$/i;

const ALLOWED_KEY =
  /(mesai|izin|puan|score|ortalama|average|total|toplam|cevapsiz|cevapsız|aded|adet|count|whatsapp|kesinti|gün|gun)/i;

export function extractNumericMetrics(row: Record<string, unknown>) {
  const metrics: { key: string; value: number }[] = [];
  for (const [key, raw] of Object.entries(row)) {
    const trimmed = key.trim();
    if (EXCLUDED_KEY.test(trimmed)) continue;
    if (!ALLOWED_KEY.test(trimmed)) continue;

    const num =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw.replace(",", "."))
          : NaN;
    if (!Number.isFinite(num)) continue;
    metrics.push({ key: trimmed, value: num });
  }
  return metrics;
}
