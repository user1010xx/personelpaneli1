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
  const upload = await prisma.excelUpload.findFirst({
    where: { moduleKey },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, uploadedAt: true },
  });
  if (!upload) return null;
  return `${upload.uploadedAt.toISOString()}#${upload.id}`;
}

/** Son veri değişikliğine göre panel revizyonu (tüm kullanıcılar için ortak) */
export async function getPanelDataRevision(): Promise<PanelRevisionPayload> {
  if (revisionCache && Date.now() - revisionCache.ts < REVISION_CACHE_MS) {
    return revisionCache.payload;
  }

  const modules: Record<string, string> = {};
  const timestamps: number[] = [];

  const [sheetRevisions, excelRevisions, qualityMax, trainingMax] = await Promise.all([
    Promise.all(SHEET_MODULE_KEYS.map((key) => latestSheetRevision(key))),
    Promise.all(EXCEL_MODULE_KEYS.map((key) => latestExcelRevision(key))),
    prisma.qualityScore.aggregate({ _max: { updatedAt: true } }),
    prisma.trainingFeedback.aggregate({ _max: { updatedAt: true } }),
  ]);

  SHEET_MODULE_KEYS.forEach((key, index) => {
    const rev = sheetRevisions[index];
    if (rev) modules[key] = rev;
  });

  EXCEL_MODULE_KEYS.forEach((key, index) => {
    const rev = excelRevisions[index];
    if (rev) modules[key] = rev;
  });

  if (qualityMax._max.updatedAt) {
    modules.KALITE = qualityMax._max.updatedAt.toISOString();
    timestamps.push(qualityMax._max.updatedAt.getTime());
  }

  if (trainingMax._max.updatedAt) {
    modules.EGITIM = trainingMax._max.updatedAt.toISOString();
    timestamps.push(trainingMax._max.updatedAt.getTime());
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
