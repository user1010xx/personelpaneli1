import { prisma } from "@/lib/db";
import { moduleTitle, roleLabel } from "@/lib/activity-log";
import { rowsToWorkbook } from "@/lib/excel-export";
import { formatWorkDuration, initiativeWorkDateRange } from "@/lib/initiative-work";
import { exampleCallDateRange } from "@/lib/example-call";
import { qualityDateRange } from "@/lib/quality";
import { TRAINING_RECORD_LABELS, trainingDateRange } from "@/lib/training";
import { EXPORT_ROW_LIMIT } from "@/lib/validation";
import { formatRangeLabel } from "@/lib/telegram/dates";

export type ReportCommand =
  | "genel"
  | "oneri"
  | "egitim"
  | "cagrigeribildirim"
  | "cagridenetleme"
  | "ornekcagri"
  | "insiyatif";

export const REPORT_COMMANDS: Record<
  ReportCommand,
  { title: string; filename: string }
> = {
  genel: { title: "Genel işlemler", filename: "genel" },
  oneri: { title: "Öneri - Talep", filename: "oneri-talep" },
  egitim: { title: "Eğitim Geribildirim", filename: "egitim" },
  cagrigeribildirim: { title: "Çağrı Geribildirim", filename: "cagri-geribildirim" },
  cagridenetleme: { title: "Çağrı Denetleme", filename: "cagri-denetleme" },
  ornekcagri: { title: "Örnek Çağrı ve Motivasyon", filename: "ornek-cagri" },
  insiyatif: { title: "İnsiyatif Çalışma", filename: "insiyatif" },
};

function stamp(from: Date, to: Date) {
  const a = from.toISOString().slice(0, 10);
  const b = to.toISOString().slice(0, 10);
  return a === b ? a : `${a}_${b}`;
}

export async function buildTelegramReport(command: ReportCommand, from: Date, to: Date) {
  const label = formatRangeLabel(from, to);
  const meta = REPORT_COMMANDS[command];
  const filename = `${meta.filename}-${stamp(from, to)}.xlsx`;

  if (command === "genel") {
    const rows = await prisma.activityLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      take: EXPORT_ROW_LIMIT,
    });
    const buffer = await rowsToWorkbook(
      rows.map((row) => ({
        tarih_saat: row.createdAt.toLocaleString("tr-TR"),
        kullanici: row.userName,
        eposta: row.userEmail,
        rol: roleLabel(row.userRole),
        modul: moduleTitle(row.moduleKey),
        islem: row.description,
      })),
      "Genel",
    );
    return { buffer, filename, count: rows.length, title: meta.title, label };
  }

  if (command === "oneri") {
    const rows = await prisma.suggestionRequest.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      take: EXPORT_ROW_LIMIT,
    });
    const buffer = await rowsToWorkbook(
      rows.map((row) => ({
        olusturulma_tarihi: row.createdAt.toLocaleString("tr-TR"),
        tur: row.type === "TALEP" ? "Talep" : "Oneri",
        ileten: row.reporterName,
        konu: row.subject,
        icerik: row.content,
      })),
      "Oneri Talep",
    );
    return { buffer, filename, count: rows.length, title: meta.title, label };
  }

  if (command === "egitim") {
    const rows = await prisma.trainingFeedback.findMany({
      where: { recordDate: trainingDateRange(from, to) },
      orderBy: { recordDate: "desc" },
      take: EXPORT_ROW_LIMIT,
    });
    const buffer = await rowsToWorkbook(
      rows.map((row) => ({
        olusturulma_tarihi: row.createdAt.toLocaleString("tr-TR"),
        personel_adi: row.personelName,
        tur: TRAINING_RECORD_LABELS[row.recordType],
        is_tarihi: row.recordDate.toISOString().slice(0, 10),
        baslangic: row.startTime,
        bitis: row.endTime,
        konu: row.topic,
        egitmen: row.trainer,
      })),
      "Egitim",
    );
    return { buffer, filename, count: rows.length, title: meta.title, label };
  }

  if (command === "cagrigeribildirim") {
    const rows = await prisma.callFeedback.findMany({
      where: { recordDate: trainingDateRange(from, to) },
      orderBy: { recordDate: "desc" },
      take: EXPORT_ROW_LIMIT,
    });
    const buffer = await rowsToWorkbook(
      rows.map((row) => ({
        olusturulma_tarihi: row.createdAt.toLocaleString("tr-TR"),
        personel_adi: row.personelName,
        tur: row.recordType === "EGITIM" ? "Cagri" : TRAINING_RECORD_LABELS[row.recordType],
        is_tarihi: row.recordDate.toISOString().slice(0, 10),
        baslangic: row.startTime,
        bitis: row.endTime,
        konu: row.topic,
        veren: row.trainer,
      })),
      "Cagri Geribildirim",
    );
    return { buffer, filename, count: rows.length, title: meta.title, label };
  }

  if (command === "cagridenetleme") {
    const rows = await prisma.qualityScore.findMany({
      where: { recordDate: qualityDateRange(from, to) },
      orderBy: { recordDate: "desc" },
      take: EXPORT_ROW_LIMIT,
    });
    const buffer = await rowsToWorkbook(
      rows.map((row) => ({
        olusturulma_tarihi: row.createdAt.toLocaleString("tr-TR"),
        personel_adi: row.personelName,
        telefon: row.phone,
        puan: row.score,
        not: row.note ?? "",
        is_tarihi: row.recordDate.toISOString().slice(0, 10),
      })),
      "Cagri Denetleme",
    );
    return { buffer, filename, count: rows.length, title: meta.title, label };
  }

  if (command === "ornekcagri") {
    const rows = await prisma.exampleCall.findMany({
      where: { recordDate: exampleCallDateRange(from, to) },
      orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
      take: EXPORT_ROW_LIMIT,
    });
    const buffer = await rowsToWorkbook(
      rows.map((row) => ({
        olusturulma_tarihi: row.createdAt.toLocaleString("tr-TR"),
        personel_adi: row.personelName,
        numara: row.phone,
        is_tarihi: row.recordDate.toISOString().slice(0, 10),
      })),
      "Ornek Cagri",
    );
    return { buffer, filename, count: rows.length, title: meta.title, label };
  }

  const rows = await prisma.initiativeWork.findMany({
    where: { recordDate: initiativeWorkDateRange(from, to) },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: EXPORT_ROW_LIMIT,
  });
  const buffer = await rowsToWorkbook(
    rows.map((row) => ({
      olusturulma_tarihi: row.createdAt.toLocaleString("tr-TR"),
      personel_adi: row.personelName,
      is_tarihi: row.recordDate.toISOString().slice(0, 10),
      arama_adedi: row.callCount,
      konusma_suresi: formatWorkDuration(row.talkDurationSeconds),
      uye_adedi: row.memberCount,
    })),
    "Insiyatif",
  );
  return { buffer, filename, count: rows.length, title: meta.title, label };
}
