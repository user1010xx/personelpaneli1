import type { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SHEET_MODULE_KEYS: ModuleKey[] = ["PERSONEL", "PUANTAJ", "WHATSAPP", "UYARI_KESINTI"];
export const EXCEL_MODULE_KEYS: ModuleKey[] = ["UYE_ADEDI", "CAGRI_SURECI"];

export function parseModuleKeyParam(raw: string): ModuleKey | null {
  const key = raw.toUpperCase();
  if (SHEET_MODULE_KEYS.includes(key as ModuleKey)) return key as ModuleKey;
  if (EXCEL_MODULE_KEYS.includes(key as ModuleKey)) return key as ModuleKey;
  return null;
}

function escapeIlikePattern(search: string) {
  const safe = search.replace(/[%_]/g, "").trim();
  return `%${safe}%`;
}

/** rowData JSON metninde + personel adında arama */
export async function sheetRowIdsMatchingSearch(moduleKey: ModuleKey, search: string) {
  const pattern = escapeIlikePattern(search);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SheetDataRow"
    WHERE "moduleKey" = ${moduleKey}::"ModuleKey"
    AND (
      COALESCE("personelName", '') ILIKE ${pattern}
      OR CAST("rowData" AS TEXT) ILIKE ${pattern}
    )
  `;
  return rows.map((r) => r.id);
}

export async function excelRowIdsMatchingSearch(moduleKey: ModuleKey, search: string) {
  const pattern = escapeIlikePattern(search);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ExcelDataRow"
    WHERE "moduleKey" = ${moduleKey}::"ModuleKey"
    AND (
      COALESCE("personelName", '') ILIKE ${pattern}
      OR CAST("rowData" AS TEXT) ILIKE ${pattern}
    )
  `;
  return rows.map((r) => r.id);
}
