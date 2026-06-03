import { prisma } from "@/lib/db";
import { EXCEL_MODULE_KEYS, SHEET_MODULE_KEYS } from "@/lib/data-query";

export type PanelRevisionPayload = {
  /** Tüm modüllerin birleşik imzası — değişince panel verisi güncellenmiş demektir */
  revision: string;
  updatedAt: string;
  modules: Record<string, string>;
};

const REVISION_CACHE_MS = 5_000;
let revisionCache: { payload: PanelRevisionPayload; ts: number } | null = null;

export function invalidatePanelRevisionCache() {
  revisionCache = null;
}

async function latestSheetRevision(moduleKey: (typeof SHEET_MODULE_KEYS)[number]) {
  const batch = await prisma.syncBatch.findFirst({
    where: { moduleKey },
    orderBy: { syncedAt: "desc" },
    select: { id: true, syncedAt: true },
  });
  if (!batch) return null;
  return `${batch.syncedAt.toISOString()}#${batch.id}`;
}

async function latestExcelRevision(moduleKey: (typeof EXCEL_MODULE_KEYS)[number]) {
  const [upload, rowCount] = await Promise.all([
    prisma.excelUpload.findFirst({
      where: { moduleKey },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, uploadedAt: true },
    }),
    prisma.excelDataRow.count({ where: { moduleKey } }),
  ]);
  return upload ? `${upload.uploadedAt.toISOString()}#${upload.id}#${rowCount}` : `empty#${rowCount}`;
}

/** Son veri değişikliğine göre panel revizyonu (tüm kullanıcılar için ortak) */
export async function getPanelDataRevision(): Promise<PanelRevisionPayload> {
  if (revisionCache && Date.now() - revisionCache.ts < REVISION_CACHE_MS) {
    return revisionCache.payload;
  }

  const modules: Record<string, string> = {};
  const timestamps: number[] = [];

  const [sheetRevisions, excelRevisions, qualityAgg, trainingAgg] = await Promise.all([
    Promise.all(SHEET_MODULE_KEYS.map((key) => latestSheetRevision(key))),
    Promise.all(EXCEL_MODULE_KEYS.map((key) => latestExcelRevision(key))),
    prisma.qualityScore.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.trainingFeedback.aggregate({ _max: { updatedAt: true }, _count: { _all: true } }),
  ]);

  SHEET_MODULE_KEYS.forEach((key, index) => {
    const rev = sheetRevisions[index];
    if (rev) modules[key] = rev;
  });

  EXCEL_MODULE_KEYS.forEach((key, index) => {
    const rev = excelRevisions[index];
    if (rev) modules[key] = rev;
  });

  if (qualityAgg._max.updatedAt || qualityAgg._count._all > 0) {
    const value = `${qualityAgg._max.updatedAt?.toISOString() ?? "empty"}#${qualityAgg._count._all}`;
    modules.KALITE = value;
    if (qualityAgg._max.updatedAt) timestamps.push(qualityAgg._max.updatedAt.getTime());
  }

  if (trainingAgg._max.updatedAt || trainingAgg._count._all > 0) {
    const value = `${trainingAgg._max.updatedAt?.toISOString() ?? "empty"}#${trainingAgg._count._all}`;
    modules.EGITIM = value;
    if (trainingAgg._max.updatedAt) timestamps.push(trainingAgg._max.updatedAt.getTime());
  }

  for (const rev of [...sheetRevisions, ...excelRevisions]) {
    if (!rev) continue;
    const iso = rev.split("#")[0];
    const ms = Date.parse(iso);
    if (Number.isFinite(ms)) timestamps.push(ms);
  }

  const revision = Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  const updatedAtMs = timestamps.length ? Math.max(...timestamps) : 0;

  const payload = {
    revision: revision || "empty",
    updatedAt: new Date(updatedAtMs).toISOString(),
    modules,
  };

  revisionCache = { payload, ts: Date.now() };
  return payload;
}
