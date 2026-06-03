import ExcelJS from "exceljs";
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
const ALLOWED_EXTENSIONS = [".xlsx", ".xlsm", ".xls", ".xlsb"];
const LEGACY_EXCEL_EXTENSIONS = [".xls", ".xlsb"];

const MODULE_COLUMN_PROJECTIONS: Partial<
  Record<ModuleKey, { columns: { index: number; label: string }[] }>
> = {
  CAGRI_SURECI: {
    columns: [
      { index: 0, label: "Personel Adı" },
      { index: 3, label: "Arama Adedi" },
      { index: 2, label: "Konuşma Süresi" },
    ],
  },
  UYE_ADEDI: {
    columns: [
      { index: 0, label: "Personel Adı" },
      { index: 7, label: "Üye Adedi" },
      { index: 8, label: "İlk Yat Adedi" },
    ],
  },
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }
    if ("hyperlink" in value && "text" in value && typeof value.text === "string") {
      return value.text;
    }
  }
  return String(value);
}

function worksheetToMatrix(worksheet: ExcelJS.Worksheet): string[][] {
  const matrix: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber > MAX_ROWS + 1) return;
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellToString(cell.value).trim();
    });
    matrix.push(values.map((value) => value ?? ""));
  });
  return matrix;
}

function parseSheetJsBuffer(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    sheetRows: MAX_ROWS + 2,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }).map((row) => row.map((cell) => String(cell ?? "").trim()));
}

export async function parseWorkbookBuffer(
  buffer: Buffer,
  fileName = "veri.xlsx",
  moduleKey?: ModuleKey,
) {
  if (buffer.length < 4) {
    throw new Error("Geçersiz dosya");
  }
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("Yalnızca .xlsx, .xlsm, .xls veya .xlsb Excel dosyaları yüklenebilir");
  }

  let matrix: string[][];
  if (LEGACY_EXCEL_EXTENSIONS.includes(extension)) {
    try {
      matrix = parseSheetJsBuffer(buffer);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Bilinmeyen okuma hatası";
      throw new Error(`Eski Excel dosyası okunamadı: ${detail}`);
    }
  } else {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Bilinmeyen okuma hatası";
      throw new Error(`Excel dosyası okunamadı: ${detail}`);
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return { headers: [] as string[], rows: [] as Record<string, string>[] };
    if (worksheet.rowCount > MAX_ROWS + 1) {
      throw new Error(`Excel en fazla ${MAX_ROWS} veri satırı içerebilir`);
    }
    matrix = worksheetToMatrix(worksheet);
  }

  if (matrix.length === 0) return { headers: [], rows: [] };
  if (matrix.length > MAX_ROWS + 1) {
    throw new Error(`Excel en fazla ${MAX_ROWS} veri satırı içerebilir`);
  }

  const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
  const hasHeaders = headers.some((h) => h.length > 0);
  const dataStart = hasHeaders ? 1 : 0;
  const projection = moduleKey ? MODULE_COLUMN_PROJECTIONS[moduleKey] : undefined;

  if (projection) {
    if (projection.columns.length === 0) {
      throw new Error("Modül kolon eşleştirmesi eksik");
    }
    const personelColumn = projection.columns[0];

    const rows = matrix
      .slice(dataStart)
      .filter((row) => String(row[personelColumn.index] ?? "").trim() !== "")
      .map((row) =>
        Object.fromEntries(
          projection.columns.map((column) => [
            column.label,
            String(row[column.index] ?? "").trim(),
          ]),
        ),
      );

    return { headers: projection.columns.map((column) => column.label), rows };
  }

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

  const { rows } = await parseWorkbookBuffer(params.buffer, params.fileName, params.moduleKey);
  if (rows.length === 0) {
    throw new Error("Excel dosyasında veri satırı bulunamadı");
  }

  const usesFixedModuleColumns = Boolean(MODULE_COLUMN_PROJECTIONS[params.moduleKey]);
  const parsedRows = rows.map((record) => ({
    record,
    parsedDate: parseRowRecordDate(record, { fallback: !usesFixedModuleColumns }),
    personelName: usesFixedModuleColumns
      ? String(record["Personel Adı"] ?? "").trim()
      : parseRowPersonelName(record),
  }));
  const outOfRangeCount = parsedRows.filter(
    ({ parsedDate }) => parsedDate && (parsedDate < periodFrom || parsedDate > periodTo),
  ).length;
  if (outOfRangeCount > 0) {
    throw new Error(
      `${outOfRangeCount} satır seçilen dönem dışında tarih içeriyor. Lütfen doğru dönemi seçin veya dosyayı kontrol edin.`,
    );
  }

  /** Dönem etiketi: tek gün veya ay başı (aylık toplu yükleme için filtrede görünür) */
  const batchRecordDate = periodFrom;

  const result = await prisma.$transaction(async (tx) => {
    const affectedUploadIds = await tx.excelDataRow.findMany({
      where: {
        moduleKey: params.moduleKey,
        OR: [
          { recordDate: { gte: periodFrom, lte: periodTo } },
          { recordDate: null, createdAt: { gte: periodFrom, lte: periodTo } },
        ],
      },
      select: { uploadId: true },
      distinct: ["uploadId"],
    });

    await tx.excelDataRow.deleteMany({
      where: {
        moduleKey: params.moduleKey,
        OR: [
          { recordDate: { gte: periodFrom, lte: periodTo } },
          { recordDate: null, createdAt: { gte: periodFrom, lte: periodTo } },
        ],
      },
    });

    if (affectedUploadIds.length > 0) {
      const uploadIds = affectedUploadIds.map((row) => row.uploadId);
      const remainingCounts = await tx.excelDataRow.groupBy({
        by: ["uploadId"],
        where: { uploadId: { in: uploadIds } },
        _count: { _all: true },
      });
      const remainingByUpload = new Map(
        remainingCounts.map((row) => [row.uploadId, row._count._all]),
      );
      const emptyUploadIds = uploadIds.filter((id) => !remainingByUpload.has(id));

      if (emptyUploadIds.length > 0) {
        await tx.excelUpload.deleteMany({
          where: { id: { in: emptyUploadIds } },
        });
      }

      await Promise.all(
        [...remainingByUpload.entries()].map(([id, rowCount]) =>
          tx.excelUpload.update({
            where: { id },
            data: { rowCount },
          }),
        ),
      );
    }

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

    const data = parsedRows.map(({ record, parsedDate, personelName }) => {
      const inRange =
        parsedDate &&
        parsedDate >= periodFrom &&
        parsedDate <= periodTo;
      return {
        moduleKey: params.moduleKey,
        uploadId: upload.id,
        rowData: record,
        recordDate: inRange ? parsedDate : batchRecordDate,
        personelName: personelName || null,
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

export async function rowsToWorkbook(rows: Record<string, unknown>[], sheetName = "Veri") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Veri");
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  worksheet.columns = columns.map((key) => ({ header: key, key }));
  worksheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
