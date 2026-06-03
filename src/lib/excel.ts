import * as XLSX from "xlsx";
import type { ModuleKey } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { pruneArchivedModuleRows } from "@/lib/archive";
import { MAX_EXCEL_BYTES } from "@/lib/validation";
import {
  headersToRecord,
  parseRowPersonelName,
  parseRowRecordDate,
  rowToRecord,
} from "@/lib/row-parsing";

const CREATE_CHUNK = 500;
const MAX_ROWS = 50_000;

export function parseWorkbookBuffer(buffer: Buffer) {
  if (buffer.length < 4) {
    throw new Error("Geçersiz dosya");
  }
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    sheetRows: MAX_ROWS + 2,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (matrix.length === 0) return { headers: [], rows: [] };
  if (matrix.length > MAX_ROWS + 1) {
    throw new Error(`Excel en fazla ${MAX_ROWS} veri satırı içerebilir`);
  }

  const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
  const hasHeaders = headers.some((h) => h.length > 0);
  const dataStart = hasHeaders ? 1 : 0;
  const effectiveHeaders = hasHeaders ? headers : matrix[0].map((_, i) => `col_${i + 1}`);

  const rows = matrix
    .slice(dataStart)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) =>
      hasHeaders ? headersToRecord(effectiveHeaders, row) : rowToRecord(row),
    );

  return { headers: effectiveHeaders, rows };
}

/** Seçilen dönemdeki eski satırlar silinir; diğer aylar korunur. */
export async function importExcelRows(params: {
  moduleKey: ModuleKey;
  fileName: string;
  buffer: Buffer;
  uploadedById?: string;
  periodFrom: Date;
  periodTo: Date;
}) {
  if (params.buffer.length > MAX_EXCEL_BYTES) {
    throw new Error(`Dosya boyutu ${MAX_EXCEL_BYTES / (1024 * 1024)} MB sınırını aşıyor`);
  }

  const periodFrom = startOfDay(params.periodFrom);
  const periodTo = endOfDay(params.periodTo);
  if (periodFrom > periodTo) {
    throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz");
  }

  const { rows } = parseWorkbookBuffer(params.buffer);
  if (rows.length === 0) {
    throw new Error("Excel dosyasında veri satırı bulunamadı");
  }

  /** Dönem etiketi: tek gün veya ay başı (aylık toplu yükleme için filtrede görünür) */
  const batchRecordDate = periodFrom;

  const result = await prisma.$transaction(async (tx) => {
    await tx.excelDataRow.deleteMany({
      where: {
        moduleKey: params.moduleKey,
        OR: [
          { recordDate: { gte: periodFrom, lte: periodTo } },
          {
            recordDate: null,
            createdAt: { gte: periodFrom, lte: periodTo },
          },
        ],
      },
    });

    const upload = await tx.excelUpload.create({
      data: {
        moduleKey: params.moduleKey,
        fileName: params.fileName,
        uploadedById: params.uploadedById,
        rowCount: rows.length,
        periodFrom,
        periodTo,
      },
    });

    const data = rows.map((record) => {
      const parsedDate = parseRowRecordDate(record);
      const inRange =
        parsedDate &&
        parsedDate >= periodFrom &&
        parsedDate <= periodTo;
      return {
        moduleKey: params.moduleKey,
        uploadId: upload.id,
        rowData: record,
        recordDate: inRange ? parsedDate : batchRecordDate,
        personelName: parseRowPersonelName(record),
      };
    });

    for (let i = 0; i < data.length; i += CREATE_CHUNK) {
      await tx.excelDataRow.createMany({ data: data.slice(i, i + CREATE_CHUNK) });
    }

    return { uploadId: upload.id, rowCount: rows.length, periodFrom, periodTo };
  });

  await pruneArchivedModuleRows(params.moduleKey);
  return result;
}

export type ExcelUploadSummary = {
  id: string;
  fileName: string;
  rowCount: number;
  uploadedAt: string;
  periodFrom: string | null;
  periodTo: string | null;
  uploadedByName: string | null;
};

export async function listExcelUploads(moduleKey: ModuleKey): Promise<ExcelUploadSummary[]> {
  const uploads = await prisma.excelUpload.findMany({
    where: { moduleKey },
    orderBy: { uploadedAt: "desc" },
    include: {
      uploadedBy: { select: { name: true } },
      _count: { select: { rows: true } },
    },
  });

  return uploads.map((u) => ({
    id: u.id,
    fileName: u.fileName,
    rowCount: u._count.rows,
    uploadedAt: u.uploadedAt.toISOString(),
    periodFrom: u.periodFrom?.toISOString() ?? null,
    periodTo: u.periodTo?.toISOString() ?? null,
    uploadedByName: u.uploadedBy?.name ?? null,
  }));
}

export async function deleteExcelUpload(moduleKey: ModuleKey, uploadId: string) {
  const upload = await prisma.excelUpload.findFirst({
    where: { id: uploadId, moduleKey },
    include: { _count: { select: { rows: true } } },
  });
  if (!upload) {
    throw new Error("Yükleme kaydı bulunamadı");
  }

  await prisma.excelUpload.delete({ where: { id: uploadId } });
  await pruneArchivedModuleRows(moduleKey);

  return {
    fileName: upload.fileName,
    rowCount: upload._count.rows,
    periodFrom: upload.periodFrom,
    periodTo: upload.periodTo,
  };
}

export function rowsToWorkbook(rows: Record<string, unknown>[], sheetName = "Veri") {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(buffer);
}
