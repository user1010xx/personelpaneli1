import { prisma } from "@/lib/db";

export type PanelRevisionPayload = {
  revision: string;
  updatedAt: string;
  modules: Record<string, string>;
};

const REVISION_CACHE_MS = 5_000;
let revisionCache: { payload: PanelRevisionPayload; ts: number } | null = null;

export function invalidatePanelRevisionCache() {
  revisionCache = null;
}

function stamp(updatedAt: Date | null | undefined, count: number) {
  return `${updatedAt?.toISOString() ?? "empty"}#${count}`;
}

export async function getPanelDataRevision(): Promise<PanelRevisionPayload> {
  if (revisionCache && Date.now() - revisionCache.ts < REVISION_CACHE_MS) {
    return revisionCache.payload;
  }

  const [qualityAgg, trainingAgg, callFeedbackAgg, exampleCallAgg, initiativeAgg, suggestionAgg] =
    await Promise.all([
    prisma.qualityScore.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.trainingFeedback.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.callFeedback.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.exampleCall.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.initiativeWork.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.suggestionRequest.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
  ]);

  const modules: Record<string, string> = {};
  const timestamps: number[] = [];

  const addModule = (key: string, updatedAt: Date | null | undefined, count: number) => {
    if (!updatedAt && count <= 0) return;
    modules[key] = stamp(updatedAt, count);
    if (updatedAt) timestamps.push(updatedAt.getTime());
  };

  addModule("KALITE", qualityAgg._max.updatedAt, qualityAgg._count._all);
  addModule("EGITIM", trainingAgg._max.updatedAt, trainingAgg._count._all);
  addModule("CALL_FEEDBACK", callFeedbackAgg._max.updatedAt, callFeedbackAgg._count._all);
  addModule("EXAMPLE_CALL", exampleCallAgg._max.updatedAt, exampleCallAgg._count._all);
  addModule("INITIATIVE_WORK", initiativeAgg._max.updatedAt, initiativeAgg._count._all);
  addModule("SUGGESTION_REQUEST", suggestionAgg._max.updatedAt, suggestionAgg._count._all);

  const revision = Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  const payload = {
    revision: revision || "empty",
    updatedAt: new Date(timestamps.length ? Math.max(...timestamps) : 0).toISOString(),
    modules,
  };

  revisionCache = { payload, ts: Date.now() };
  return payload;
}
