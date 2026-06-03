import { subMonths } from "date-fns";
import type { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_ARCHIVE_MONTHS = 12;

export function archiveMonths() {
  const n = Number(process.env.ARCHIVE_MONTHS ?? DEFAULT_ARCHIVE_MONTHS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ARCHIVE_MONTHS;
}

/** Eski sync/upload batch'lerini ve satırlarını temizler (cascade). */
export async function pruneArchivedModuleRows(moduleKey: ModuleKey) {
  const cutoff = subMonths(new Date(), archiveMonths());

  if (["PERSONEL", "PUANTAJ", "WHATSAPP", "UYARI_KESINTI"].includes(moduleKey)) {
    await prisma.syncBatch.deleteMany({
      where: { moduleKey, syncedAt: { lt: cutoff } },
    });
    return;
  }

  if (["UYE_ADEDI", "CAGRI_SURECI"].includes(moduleKey)) {
    await prisma.excelUpload.deleteMany({
      where: { moduleKey, uploadedAt: { lt: cutoff } },
    });
  }
}
