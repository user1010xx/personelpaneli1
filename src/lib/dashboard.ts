import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { displayPersonelName, normalizePersonelName } from "@/lib/utils";
import { AGGREGATE_ROW_LIMIT } from "@/lib/validation";

export const DASHBOARD_ROW_LIMIT = AGGREGATE_ROW_LIMIT;

export type DashboardSourceRows = {
  quality: { personelName: string; score: number }[];
  initiative: { personelName: string }[];
  training: { personelName: string; recordType: "EGITIM" | "GERIBILDIRIM" }[];
  callFeedback: { personelName: string }[];
  exampleCalls: { personelName: string; recordType?: "ORNEK_CAGRI" | "MOTIVASYON" }[];
  knowledgeDuels: { personelName: string; result: "DOGRU" | "YANLIS" }[];
};

type MetricBucket = {
  scores: number[];
  insiyatif: number;
  geribildirim: number;
  egitim: number;
  ornekCagri: number;
  motivasyon: number;
  bilgiDuellosuDogru: number;
  bilgiDuellosuYanlis: number;
};

export type DashboardPerson = {
  personelName: string;
  dinlenenCagriAdedi: number;
  ortalamaPuan: number;
  insiyatifAdedi: number;
  geribildirimAdedi: number;
  egitimAdedi: number;
  ornekCagriAdedi: number;
  motivasyonAdedi: number;
  bilgiDuellosuDogruAdedi: number;
  bilgiDuellosuYanlisAdedi: number;
};

export type DashboardTotals = {
  dinlenenCagriAdedi: number;
  ortalamaPuan: number;
  insiyatifAdedi: number;
  geribildirimAdedi: number;
  egitimAdedi: number;
  ornekCagriAdedi: number;
  motivasyonAdedi: number;
  bilgiDuellosuDogruAdedi: number;
  bilgiDuellosuYanlisAdedi: number;
  personelAdedi: number;
};

export type LeaderEntry = {
  personelName: string;
  value: number;
  display: string;
};

export type DashboardLeaders = {
  dinlenen: LeaderEntry[];
  ortalamaPuan: LeaderEntry[];
  insiyatif: LeaderEntry[];
  geribildirim: LeaderEntry[];
  egitim: LeaderEntry[];
  ornekCagri: LeaderEntry[];
  motivasyon: LeaderEntry[];
  bilgiDuellosuDogru: LeaderEntry[];
  bilgiDuellosuYanlis: LeaderEntry[];
};

export type DashboardResult = {
  rows: DashboardPerson[];
  totals: DashboardTotals;
  leaders: DashboardLeaders;
  from: string;
  to: string;
  truncated?: boolean;
};

function topUniqueLeaders(
  rows: DashboardPerson[],
  pick: (p: DashboardPerson) => number,
  format: (v: number) => string,
  limit = 3,
): LeaderEntry[] {
  const sorted = [...rows]
    .map((p) => ({ personelName: p.personelName, value: pick(p) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

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

function emptyBucket(): MetricBucket {
  return {
    scores: [],
    insiyatif: 0,
    geribildirim: 0,
    egitim: 0,
    ornekCagri: 0,
    motivasyon: 0,
    bilgiDuellosuDogru: 0,
    bilgiDuellosuYanlis: 0,
  };
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function toPerson(personelName: string, data: MetricBucket): DashboardPerson {
  return {
    personelName,
    dinlenenCagriAdedi: data.scores.length,
    ortalamaPuan: avg(data.scores),
    insiyatifAdedi: data.insiyatif,
    geribildirimAdedi: data.geribildirim,
    egitimAdedi: data.egitim,
    ornekCagriAdedi: data.ornekCagri,
    motivasyonAdedi: data.motivasyon,
    bilgiDuellosuDogruAdedi: data.bilgiDuellosuDogru,
    bilgiDuellosuYanlisAdedi: data.bilgiDuellosuYanlis,
  };
}

export function buildDashboardResult(
  sources: DashboardSourceRows,
  params: { from: Date; to: Date; search?: string; truncated?: boolean },
): DashboardResult {
  const search = params.search?.trim().toLocaleLowerCase("tr-TR") ?? "";
  const displayNames = new Map<string, string>();
  const buckets = new Map<string, MetricBucket>();

  const register = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return null;
    const key = normalizePersonelName(name);
    if (!displayNames.has(key)) displayNames.set(key, displayPersonelName(name));
    if (!buckets.has(key)) buckets.set(key, emptyBucket());
    return key;
  };

  for (const row of sources.quality) {
    const key = register(row.personelName);
    if (!key) continue;
    buckets.get(key)!.scores.push(row.score);
  }

  for (const row of sources.initiative) {
    const key = register(row.personelName);
    if (!key) continue;
    buckets.get(key)!.insiyatif += 1;
  }

  for (const row of sources.training) {
    const key = register(row.personelName);
    if (!key) continue;
    if (row.recordType === "GERIBILDIRIM") buckets.get(key)!.geribildirim += 1;
    else buckets.get(key)!.egitim += 1;
  }

  for (const row of sources.callFeedback) {
    const key = register(row.personelName);
    if (!key) continue;
    buckets.get(key)!.geribildirim += 1;
  }

  for (const row of sources.exampleCalls) {
    const key = register(row.personelName);
    if (!key) continue;
    if (row.recordType === "MOTIVASYON") buckets.get(key)!.motivasyon += 1;
    else buckets.get(key)!.ornekCagri += 1;
  }

  for (const row of sources.knowledgeDuels) {
    const key = register(row.personelName);
    if (!key) continue;
    if (row.result === "DOGRU") buckets.get(key)!.bilgiDuellosuDogru += 1;
    else buckets.get(key)!.bilgiDuellosuYanlis += 1;
  }

  const rows: DashboardPerson[] = [];
  for (const [key, data] of buckets) {
    const personelName = displayNames.get(key) ?? key;
    if (search && !personelName.toLocaleLowerCase("tr-TR").includes(search)) continue;
    rows.push(toPerson(personelName, data));
  }
  rows.sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));

  const weightedScoreTotal = rows.reduce(
    (sum, row) => sum + row.ortalamaPuan * row.dinlenenCagriAdedi,
    0,
  );
  const dinlenenCagriAdedi = rows.reduce((sum, row) => sum + row.dinlenenCagriAdedi, 0);

  const totals: DashboardTotals = {
    dinlenenCagriAdedi,
    ortalamaPuan:
      dinlenenCagriAdedi > 0 ? Number((weightedScoreTotal / dinlenenCagriAdedi).toFixed(2)) : 0,
    insiyatifAdedi: rows.reduce((sum, row) => sum + row.insiyatifAdedi, 0),
    geribildirimAdedi: rows.reduce((sum, row) => sum + row.geribildirimAdedi, 0),
    egitimAdedi: rows.reduce((sum, row) => sum + row.egitimAdedi, 0),
    ornekCagriAdedi: rows.reduce((sum, row) => sum + row.ornekCagriAdedi, 0),
    motivasyonAdedi: rows.reduce((sum, row) => sum + row.motivasyonAdedi, 0),
    bilgiDuellosuDogruAdedi: rows.reduce((sum, row) => sum + row.bilgiDuellosuDogruAdedi, 0),
    bilgiDuellosuYanlisAdedi: rows.reduce((sum, row) => sum + row.bilgiDuellosuYanlisAdedi, 0),
    personelAdedi: rows.length,
  };

  return {
    rows,
    totals,
    leaders: {
      dinlenen: topUniqueLeaders(rows, (p) => p.dinlenenCagriAdedi, (v) => `${Math.round(v)} çağrı`),
      ortalamaPuan: topUniqueLeaders(rows, (p) => p.ortalamaPuan, (v) => `${v.toFixed(1)} puan`),
      insiyatif: topUniqueLeaders(rows, (p) => p.insiyatifAdedi, (v) => `${Math.round(v)} çalışma`),
      geribildirim: topUniqueLeaders(rows, (p) => p.geribildirimAdedi, (v) => `${Math.round(v)} geri bildirim`),
      egitim: topUniqueLeaders(rows, (p) => p.egitimAdedi, (v) => `${Math.round(v)} eğitim`),
      ornekCagri: topUniqueLeaders(rows, (p) => p.ornekCagriAdedi, (v) => `${Math.round(v)} örnek çağrı`),
      motivasyon: topUniqueLeaders(rows, (p) => p.motivasyonAdedi, (v) => `${Math.round(v)} motivasyon`),
      bilgiDuellosuDogru: topUniqueLeaders(
        rows,
        (p) => p.bilgiDuellosuDogruAdedi,
        (v) => `${Math.round(v)} doğru`,
      ),
      bilgiDuellosuYanlis: topUniqueLeaders(
        rows,
        (p) => p.bilgiDuellosuYanlisAdedi,
        (v) => `${Math.round(v)} yanlış`,
      ),
    },
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    truncated: params.truncated,
  };
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

  const [
    qualityRows,
    initiativeRows,
    trainingRows,
    callFeedbackRows,
    exampleCallRows,
    knowledgeDuelRows,
  ] = await Promise.all([
    prisma.qualityScore.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true, score: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
    prisma.initiativeWork.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
    prisma.trainingFeedback.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true, recordType: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
    prisma.callFeedback.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
    prisma.exampleCall.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true, recordType: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
    prisma.knowledgeDuel.findMany({
      where: { recordDate: { gte: from, lte: to } },
      select: { personelName: true, result: true },
      take: DASHBOARD_ROW_LIMIT,
      orderBy: [{ recordDate: "desc" }],
    }),
  ]);

  return buildDashboardResult(
    {
      quality: qualityRows,
      initiative: initiativeRows,
      training: trainingRows,
      callFeedback: callFeedbackRows,
      exampleCalls: exampleCallRows,
      knowledgeDuels: knowledgeDuelRows,
    },
    {
      from,
      to,
      search: params.search,
      truncated:
        qualityRows.length >= DASHBOARD_ROW_LIMIT ||
        initiativeRows.length >= DASHBOARD_ROW_LIMIT ||
        trainingRows.length >= DASHBOARD_ROW_LIMIT ||
        callFeedbackRows.length >= DASHBOARD_ROW_LIMIT ||
        exampleCallRows.length >= DASHBOARD_ROW_LIMIT ||
        knowledgeDuelRows.length >= DASHBOARD_ROW_LIMIT,
    },
  );
}

export function emptyDashboardTotals(): DashboardTotals {
  return {
    dinlenenCagriAdedi: 0,
    ortalamaPuan: 0,
    insiyatifAdedi: 0,
    geribildirimAdedi: 0,
    egitimAdedi: 0,
    ornekCagriAdedi: 0,
    motivasyonAdedi: 0,
    bilgiDuellosuDogruAdedi: 0,
    bilgiDuellosuYanlisAdedi: 0,
    personelAdedi: 0,
  };
}
