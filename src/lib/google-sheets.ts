import { google } from "googleapis";
import type { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pruneArchivedModuleRows } from "@/lib/archive";
import { googleServiceAccountError, hasGoogleServiceAccount } from "@/lib/google-env";
import { parseSheetRows } from "@/lib/sheet-parsers";
import { resolveSpreadsheetReadRange } from "@/lib/sheet-range";

const CREATE_CHUNK = 500;

function normalizePrivateKey(raw: string) {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, "\n").trim();

  if (!key.includes("BEGIN PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8").trim();
      if (decoded.includes("BEGIN PRIVATE KEY")) return decoded;
    } catch {
      // ignore and throw the friendly error below
    }
  }

  if (!key.includes("BEGIN PRIVATE KEY") || !key.includes("END PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY formatı geçersiz. JSON içindeki private_key değerini BEGIN/END PRIVATE KEY satırlarıyla birlikte ekleyin ve \\n karakterlerini koruyun.",
    );
  }

  return key;
}

function getServiceAccountCredentials() {
  if (!hasGoogleServiceAccount()) {
    throw new Error(googleServiceAccountError());
  }

  return {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),
    private_key: normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!),
  };
}

function extractSpreadsheetId(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  return trimmed;
}

/** Sheet = source of truth: yeni batch eklenir, eski batch'ler kaldırılır. */
export async function syncSheetModule(moduleKey: ModuleKey) {
  const config = await prisma.sheetConfig.findUnique({ where: { moduleKey } });
  if (!config?.spreadsheetId) {
    throw new Error("Bu modül için Google Sheets bağlantısı tanımlı değil");
  }

  if (config.headerRow < 1) {
    throw new Error("Başlık satırı (headerRow) en az 1 olmalı");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: getServiceAccountCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = extractSpreadsheetId(config.spreadsheetId);

  const { range, tabTitle } = await resolveSpreadsheetReadRange(sheets, spreadsheetId, {
    sheetName: config.sheetName,
    range: config.range,
  });

  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("DECODER routines") || msg.includes("unsupported")) {
      throw new Error(
        "Google Service Account private key okunamadı. Railway'de GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY değerini JSON içindeki private_key alanı olarak, BEGIN/END PRIVATE KEY dahil ve \\n karakterleri korunacak şekilde ekleyin.",
      );
    }
    if (
      msg.includes("This operation is not supported for this document") ||
      msg.includes("Office file") ||
      msg.includes("document is not supported")
    ) {
      throw new Error(
        "Bu dosya Google Sheets formatında değil; Office/Excel dosyası olarak duruyor. Dosyayı Google Drive'da açıp Dosya > Google E-Tablolar olarak kaydet seçeneğiyle Google Sheets'e dönüştürün, oluşan yeni Google Sheet linkini panelde kullanın ve service account mailiyle paylaşın.",
      );
    }
    if (msg.includes("Unable to parse range")) {
      throw new Error(
        `Google Sheets aralığı okunamadı (${range}). Sekme adını kontrol edin; Türkçe dosyalarda sekme genelde "Sayfa1" olur, "Sheet1" değil.`,
      );
    }
    throw err;
  }

  const values = response.data.values ?? [];
  const headerIndex = Math.max(config.headerRow - 1, 0);
  const headers = (values[headerIndex] ?? []).map((h) => String(h ?? ""));
  const sourceRows =
    values.length === 0
      ? []
      : values
          .slice(headerIndex + 1)
          .map((row, index) => ({
            row,
            sourceRow: headerIndex + index + 2,
          }))
          .filter(({ row }) => row.some((cell) => String(cell ?? "").trim() !== ""));

  const parsed = parseSheetRows(
    moduleKey,
    headers,
    sourceRows.map((item) => item.row),
    { sheetTab: tabTitle },
  );

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.syncBatch.create({
      data: { moduleKey, rowCount: parsed.length },
    });

    if (parsed.length > 0) {
      const rows = parsed.map((row, index) => ({
        moduleKey,
        syncBatchId: batch.id,
        rowData: row.rowData,
        recordDate: row.recordDate,
        personelName: row.personelName,
        sourceRow: sourceRows[index]?.sourceRow ?? null,
      }));

      for (let i = 0; i < rows.length; i += CREATE_CHUNK) {
        await tx.sheetDataRow.createMany({ data: rows.slice(i, i + CREATE_CHUNK) });
      }
    }

    await tx.sheetDataRow.deleteMany({
      where: { moduleKey, syncBatchId: { not: batch.id } },
    });
    await tx.syncBatch.deleteMany({
      where: { moduleKey, id: { not: batch.id } },
    });

    return {
      batchId: batch.id,
      rowCount: parsed.length,
      syncedAt: batch.syncedAt,
      sheetTab: tabTitle,
      range,
    };
  });

  await pruneArchivedModuleRows(moduleKey);
  return result;
}
