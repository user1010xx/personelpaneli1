import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { findMetricInRow } from "@/lib/duration-parse";
import { displayPersonelName } from "@/lib/utils";
import {
  loadPersonelAliases,
  resolvePersonelBucketKey,
  resolvePersonelDisplayName,
} from "@/lib/personel-alias";

const DASHBOARD_ROW_LIMIT = 25_000;

type MetricBucket = {
  uye: number[];
  ilkYat: number[];
  aramaAdedi: number[];
  konusmaSuresi: number[];
  kalite: number[];
  whatsapp: number[];
};

export type DashboardPerson = {
  personelName: string;
  uyeAdedi: number;
  ilkYatAdedi: number;
  ortalamaAramaAdedi: number;
  ortalamaKonusmaSuresi: number;
  ortalamaCagriPuani: number;
  ortalamaWhatsappCevapsiz: number;
};

export type LeaderEntry = {
  personelName: string;
  value: number;
  display: string;
};

export type DashboardLeaders = {
  uyelik: LeaderEntry[];
  cagriPuani: LeaderEntry[];
  konusmaSuresi: LeaderEntry[];
  aramaAdedi: LeaderEntry[];
  whatsappCevapsiz: LeaderEntry[];
};

export type DashboardResult = {
  rows: DashboardPerson[];
  leaders: DashboardLeaders;
  from: string;
  to: string;
  truncated?: boolean;
};

function datedRowWhere(from: Date, to: Date) {
  return {
    OR: [
      { recordDate: { gte: from, lte: to } },
      { recordDate: null, createdAt: { gte: from, lte: to } },
    ],
  };
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function topUniqueLeaders(
  rows: DashboardPerson[],
  pick: (p: DashboardPerson) => number,
  format: (v: number) => string,
  order: "desc" | "asc" = "desc",
  limit = 3,
): LeaderEntry[] {
  const sorted = [...rows]
    .map((p) => ({ personelName: p.personelName, value: pick(p) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => (order === "desc" ? b.value - a.value : a.value - b.value));

  const picked = new Set<string>();
  const result: LeaderEntry[] = [];
  for (const item of sorted) {
    if (picked.has(item.personelName)) continue;
    picked.add(item.personelName);
    result.push({
      personelName: item.personelName,
      value: item.value,
      display: format(item.value),
    });
    if (result.length >= limit) break;
  }
  return result;
}

function createMetricBucket(): MetricBucket {
  return {
    uye: [],
    ilkYat: [],
    aramaAdedi: [],
    konusmaSuresi: [],
    kalite: [],
    whatsapp: [],
  };
}

export function dashboardWeekKey(date: Date) {
  const day = date.getDate();
  const startDay = day <= 7 ? 1 : day <= 14 ? 8 : day <= 21 ? 15 : 22;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${String(startDay).padStart(2, "0")}`;
}

function rowDateForWeek(row: { recordDate: Date | null; createdAt?: Date }) {
  return row.recordDate ?? row.createdAt ?? null;
}

function bucketToDashboardPerson(
  personelName: string,
  data: MetricBucket,
  cagriPeriodCount: number,
): DashboardPerson {
  return {
    personelName,
    uyeAdedi: data.uye.reduce((total, value) => total + value, 0),
    ilkYatAdedi: data.ilkYat.reduce((total, value) => total + value, 0),
    ortalamaAramaAdedi: avgByCount(data.aramaAdedi, cagriPeriodCount || data.aramaAdedi.length),
    ortalamaKonusmaSuresi: avgByCount(
      data.konusmaSuresi,
      cagriPeriodCount || data.konusmaSuresi.length,
    ),
    ortalamaCagriPuani: avg(data.kalite),
    ortalamaWhatsappCevapsiz: avg(data.whatsapp),
  };
}

function parsePersonelFromRow(rowData: unknown) {
  if (!rowData || typeof rowData !== "object") return "";
  const record = rowData as Record<string, unknown>;
  for (const key of ["personel", "personel adi", "personel adı", "ad soyad", "isim", "ad"]) {
    for (const [k, v] of Object.entries(record)) {
      if (k.toLocaleLowerCase("tr-TR").includes(key) && typeof v === "string" && v.trim()) {
        return v.trim();
      }
    }
  }
  return "";
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

export function avgByCount(values: number[], count: number) {
  if (values.length === 0 || count <= 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / count).toFixed(2));
}

export function pickWhatsappAverageMetric(row: Record<string, unknown>) {
  return findMetricInRow(row, [
    "ortalama whatsapp cevaps",
    "ortalama whatsapp",
    "ortalama cevaps",
    "ortalama",
  ]);
}

export function pickIlkYatMetric(row: Record<string, unknown>) {
  return findMetricInRow(row, [
    "ilk yat adedi",
    "ilk yat",
    "ilk yatırım",
    "ilk yatirim",
    "first deposit",
    "deposit",
  ]);
}

export async function getDashboardData(params: {
  from?: Date | null;
  to?: Date | null;
  search?: string;
}): Promise<DashboardResult> {
  const to = params.to ? endOfDay(params.to) : endOfDay(new Date());
  const from = params.from
    ? startOfDay(params.from)
    : startOfDay(new Date(to.getTime() - 18 * 86400000));
  const search = params.search?.trim().toLocaleLowerCase("tr-TR") ?? "";
  const range = datedRowWhere(from, to);

  const [
    sheetRows,
    excelRows,
    qualityRows,
    personelRows,
    globalAliases,
    whatsappAliases,
    uyeAdediAliases,
    cagriSureciAliases,
    kaliteAliases,
  ] = await Promise.all([
    prisma.sheetDataRow.findMany({
      where: { moduleKey: "WHATSAPP", ...range },
      select: {
        personelName: true,
        recordDate: true,
        createdAt: true,
        rowData: true,
      },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.excelDataRow.findMany({
      where: { moduleKey: { in: ["UYE_ADEDI", "CAGRI_SURECI"] }, ...range },
      select: {
        uploadId: true,
        moduleKey: true,
        personelName: true,
        recordDate: true,
        createdAt: true,
        rowData: true,
      },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.qualityScore.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true, score: true, recordDate: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
    prisma.sheetDataRow.findMany({
      where: { moduleKey: "PERSONEL" },
      select: { personelName: true, rowData: true },
      take: 5000,
      orderBy: [{ personelName: "asc" }, { createdAt: "desc" }],
    }),
    loadPersonelAliases(),
    loadPersonelAliases("WHATSAPP"),
    loadPersonelAliases("UYE_ADEDI"),
    loadPersonelAliases("CAGRI_SURECI"),
    loadPersonelAliases("KALITE"),
  ]);

  const displayNames = new Map<string, string>();
  const buckets = new Map<string, MetricBucket>();
  const weeklyBuckets = new Map<string, MetricBucket>();
  const cagriPeriods = new Set<string>();
  const weeklyCagriPeriods = new Map<string, Set<string>>();

  const register = (rawName: string, aliases = globalAliases) => {
    const name = rawName.trim();
    if (!name) return null;
    const resolvedName = resolvePersonelDisplayName(name, aliases);
    const key = resolvePersonelBucketKey(name, aliases);
    if (!displayNames.has(key)) {
      displayNames.set(key, displayPersonelName(resolvedName));
    }
    if (!buckets.has(key)) {
      buckets.set(key, createMetricBucket());
    }
    return key;
  };

  const getWeeklyBucket = (weekKey: string, personKey: string) => {
    const key = `${weekKey}::${personKey}`;
    if (!weeklyBuckets.has(key)) {
      weeklyBuckets.set(key, createMetricBucket());
    }
    return weeklyBuckets.get(key)!;
  };

  for (const row of personelRows) {
    const name = row.personelName || parsePersonelFromRow(row.rowData);
    register(name);
  }

  for (const row of excelRows) {
    const name = row.personelName || parsePersonelFromRow(row.rowData);
    const aliases = row.moduleKey === "UYE_ADEDI" ? uyeAdediAliases : cagriSureciAliases;
    const key = register(name, aliases);
    if (!key) continue;
    const data = row.rowData as Record<string, unknown>;
    const b = buckets.get(key)!;
    const metricDate = rowDateForWeek(row);
    const weeklyBucket = metricDate ? getWeeklyBucket(dashboardWeekKey(metricDate), key) : null;

    if (row.moduleKey === "UYE_ADEDI") {
      const uye = findMetricInRow(data, ["üye", "uye", "aded", "adet", "count", "toplam"]);
      const ilkYat = pickIlkYatMetric(data);
      b.uye.push(uye);
      b.ilkYat.push(ilkYat);
      weeklyBucket?.uye.push(uye);
      weeklyBucket?.ilkYat.push(ilkYat);
    }

    if (row.moduleKey === "CAGRI_SURECI") {
      const periodKey = row.recordDate?.toISOString().slice(0, 10) ?? row.uploadId;
      const weekKey = metricDate ? dashboardWeekKey(metricDate) : null;
      cagriPeriods.add(periodKey);
      if (weekKey) {
        const periodSet = weeklyCagriPeriods.get(weekKey) ?? new Set<string>();
        periodSet.add(periodKey);
        weeklyCagriPeriods.set(weekKey, periodSet);
      }
      const konusmaSuresi = findMetricInRow(
        data,
        ["süre", "sure", "konuşma", "konusma", "duration", "saniye", "dakika"],
        true,
      );
      const aramaAdedi = findMetricInRow(data, ["arama", "adet", "call", "count", "çağrı", "cagri", "toplam"]);
      b.konusmaSuresi.push(konusmaSuresi);
      b.aramaAdedi.push(aramaAdedi);
      weeklyBucket?.konusmaSuresi.push(konusmaSuresi);
      weeklyBucket?.aramaAdedi.push(aramaAdedi);
    }
  }

  for (const row of sheetRows) {
    const name = row.personelName || parsePersonelFromRow(row.rowData);
    const key = register(name, whatsappAliases);
    if (!key) continue;
    const data = row.rowData as Record<string, unknown>;
    const metric = pickWhatsappAverageMetric(data);
    buckets.get(key)!.whatsapp.push(metric);
    const metricDate = rowDateForWeek(row);
    if (metricDate) {
      getWeeklyBucket(dashboardWeekKey(metricDate), key).whatsapp.push(metric);
    }
  }

  for (const row of qualityRows) {
    const key = register(row.personelName, kaliteAliases);
    if (!key) continue;
    buckets.get(key)!.kalite.push(row.score);
    getWeeklyBucket(dashboardWeekKey(row.recordDate), key).kalite.push(row.score);
  }

  const rows: DashboardPerson[] = [];

  for (const [key, data] of buckets) {
    const personelName = displayNames.get(key) ?? key;
    const person = bucketToDashboardPerson(personelName, data, cagriPeriods.size);

    if (search && !personelName.toLocaleLowerCase("tr-TR").includes(search)) {
      continue;
    }

    rows.push(person);
  }

  rows.sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));

  const weeklyRows: DashboardPerson[] = [];
  for (const [bucketKey, data] of weeklyBuckets) {
    const separatorIndex = bucketKey.indexOf("::");
    const weekKey = bucketKey.slice(0, separatorIndex);
    const personKey = bucketKey.slice(separatorIndex + 2);
    const personelName = displayNames.get(personKey) ?? personKey;
    if (search && !personelName.toLocaleLowerCase("tr-TR").includes(search)) {
      continue;
    }
    weeklyRows.push(
      bucketToDashboardPerson(personelName, data, weeklyCagriPeriods.get(weekKey)?.size ?? 0),
    );
  }

  const leaders: DashboardLeaders = {
    uyelik: topUniqueLeaders(weeklyRows, (p) => p.uyeAdedi, (v) => `${Math.round(v)} üye`),
    cagriPuani: topUniqueLeaders(weeklyRows, (p) => p.ortalamaCagriPuani, (v) => `${v.toFixed(1)} puan`),
    konusmaSuresi: topUniqueLeaders(weeklyRows, (p) => p.ortalamaKonusmaSuresi, (v) => formatDuration(v)),
    aramaAdedi: topUniqueLeaders(weeklyRows, (p) => p.ortalamaAramaAdedi, (v) => `${Math.round(v)} arama`),
    whatsappCevapsiz: topUniqueLeaders(
      weeklyRows,
      (p) => p.ortalamaWhatsappCevapsiz,
      (v) => `${Math.round(v)} cevapsız`,
    ),
  };

  const truncated =
    sheetRows.length >= DASHBOARD_ROW_LIMIT ||
    excelRows.length >= DASHBOARD_ROW_LIMIT ||
    qualityRows.length >= DASHBOARD_ROW_LIMIT;

  return {
    rows,
    leaders,
    from: from.toISOString(),
    to: to.toISOString(),
    truncated,
  };
}
