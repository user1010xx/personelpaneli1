import type { ModuleKey } from "@prisma/client";
import type { Period } from "@/lib/date-ranges";
import { getPeriodRange } from "@/lib/date-ranges";
import { aggregatePuantajByPersonel } from "@/lib/sheet-parsers/puantaj";
import { computeModuleStats, type ModuleStats, type StatRow } from "@/lib/stats";

export type PuantajOzet = {
  personelName: string;
  mesaiGun: number;
  izinGun: number;
  kayitliGun: number;
};

export type SheetModuleStats = ModuleStats & {
  puantajOzet?: PuantajOzet[];
  uyariSayisi?: number;
  kesintiSayisi?: number;
};

function filterByPeriod(rows: StatRow[], period: Period, anchor = new Date()) {
  const { from, to } = getPeriodRange(period, anchor);
  return rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= from && date <= to;
  });
}

function computeStatsForRange(
  rows: StatRow[],
  period: Period,
  range: { from: Date; to: Date },
): ModuleStats {
  const filtered = rows.filter((row) => {
    const date = row.recordDate ?? row.createdAt;
    return date >= range.from && date <= range.to;
  });
  return computeModuleStats(filtered, period, range.to);
}

export function computeSheetModuleStats(
  moduleKey: ModuleKey,
  rows: StatRow[],
  period: Period,
  anchor = new Date(),
  customRange?: { from: Date; to: Date },
): SheetModuleStats {
  const periodRange = getPeriodRange(period, anchor);
  const range = customRange ?? periodRange;
  const filtered =
    moduleKey === "UYARI_KESINTI" ? rows : filterByPeriod(rows, period, anchor);
  const base =
    moduleKey === "UYARI_KESINTI"
      ? {
          ...computeModuleStats(rows, period, anchor),
          recordCount: rows.length,
        }
      : customRange
        ? computeStatsForRange(rows, period, customRange)
        : computeModuleStats(rows, period, anchor);

  if (moduleKey === "PUANTAJ") {
    const puantajRows = rows.map((r) => ({
      personelName: r.personelName ?? null,
      recordDate: r.recordDate,
      rowData: r.rowData,
    }));
    const puantajOzet = aggregatePuantajByPersonel(puantajRows, range.from, range.to);
    const toplamMesai = puantajOzet.reduce((s, p) => s + p.mesaiGun, 0);
    const toplamIzin = puantajOzet.reduce((s, p) => s + p.izinGun, 0);
    return {
      ...base,
      averages: [
        { key: "Toplam mesai (gün)", value: Number(toplamMesai.toFixed(1)) },
        { key: "Toplam izin (gün)", value: Number(toplamIzin.toFixed(1)) },
      ],
      puantajOzet,
    };
  }

  if (moduleKey === "UYARI_KESINTI") {
    let uyariSayisi = 0;
    let kesintiSayisi = 0;
    for (const row of filtered) {
      const tur =
        (row.rowData["Kayıt Türü"] as string) ??
        (row.rowData["kayitTuru"] as string) ??
        "";
      if (String(tur).toLowerCase().includes("kesinti")) kesintiSayisi += 1;
      else uyariSayisi += 1;
    }
    return {
      ...base,
      uyariSayisi,
      kesintiSayisi,
      averages: [
        { key: "Uyarı", value: uyariSayisi },
        { key: "Kesinti", value: kesintiSayisi },
      ],
    };
  }

  if (moduleKey === "PERSONEL") {
    const allPersonel = new Set<string>();
    for (const row of rows) {
      const name =
        row.personelName?.trim() ||
        (typeof row.rowData["Personel Adı"] === "string"
          ? String(row.rowData["Personel Adı"]).trim()
          : "") ||
        (typeof row.rowData.personelName === "string"
          ? String(row.rowData.personelName).trim()
          : "");
      if (name) allPersonel.add(name);
    }
    return {
      ...base,
      totalPersonelCount: allPersonel.size,
    };
  }

  if (moduleKey === "WHATSAPP") {
    const sums = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
      const data = row.rowData;
      for (const key of [
        "Ortalama WhatsApp Cevapsız",
        "Total WhatsApp Cevapsız",
      ]) {
        const raw = data[key];
        const n = Number(String(raw ?? "").replace(",", "."));
        if (!Number.isFinite(n)) continue;
        const cur = sums.get(key) ?? { total: 0, count: 0 };
        cur.total += n;
        cur.count += 1;
        sums.set(key, cur);
      }
    }
    const averages = [...sums.entries()].map(([key, { total, count }]) => ({
      key,
      value: count > 0 ? Number((total / count).toFixed(2)) : 0,
    }));
    const personelSet = new Set<string>();
    for (const row of rows) {
      if (row.personelName?.trim()) personelSet.add(row.personelName.trim());
    }
    return {
      ...base,
      recordCount: rows.length,
      uniquePersonel: personelSet.size,
      averages,
    };
  }

  return base;
}
