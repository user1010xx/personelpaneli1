import { isAllowedTelegramChat, telegramEnabled } from "@/lib/telegram/config";
import { sendTelegramDocument, sendTelegramMessage, type TelegramUpdate } from "@/lib/telegram/client";
import { parseTelegramDateRange } from "@/lib/telegram/dates";
import {
  REPORT_COMMANDS,
  buildTelegramReport,
  type ReportCommand,
} from "@/lib/telegram/reports";

type PendingAsk = {
  command: ReportCommand;
  askedAt: number;
};

const pendingByChat = new Map<string, PendingAsk>();
const PENDING_MS = 10 * 60 * 1000;

const START_TEXT = [
  "Çağrı Merkezi panel botu",
  "",
  "Komutlar:",
  "",
  "/start",
  "Botun komut listesini ve açıklamalarını gösterir.",
  "",
  "/genel",
  "Seçilen tarihte panelde yapılan tüm işlemleri Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/oneri",
  "Öneri - Talep kayıtlarını Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/egitim",
  "Eğitim kayıtlarını Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/cagrigeribildirim",
  "Çağrı geribildirim kayıtlarını Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/cagridenetleme",
  "Çağrı denetleme (puan) kayıtlarını Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/ornek",
  "Örnek çağrı ve motivasyon kayıtlarını Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/insiyatif",
  "İnsiyatif çalışma kayıtlarını Excel olarak ister. Tarih veya tarih aralığı sorulur.",
  "",
  "/iptal",
  "Bekleyen tarih sorusunu iptal eder.",
  "",
  "Tarih örnekleri:",
  "22.08.2026",
  "01.08.2026 - 22.08.2026",
  "",
  "Komutla birlikte de yazabilirsiniz:",
  "/egitim 01.08.2026 - 22.08.2026",
].join("\n");

const DATE_PROMPT = [
  "Hangi tarih aralığını istiyorsunuz?",
  "",
  "Tek tarih: 22.08.2026",
  "Aralık: 01.08.2026 - 22.08.2026",
  "",
  "İptal için /iptal yazın.",
].join("\n");

const COMMAND_ALIASES: Record<string, ReportCommand> = {
  genel: "genel",
  oneri: "oneri",
  oneritalep: "oneri",
  "oneri-talep": "oneri",
  egitim: "egitim",
  cagrigeribildirim: "cagrigeribildirim",
  "cagri-geribildirim": "cagrigeribildirim",
  cagridenetleme: "cagridenetleme",
  "cagri-denetleme": "cagridenetleme",
  kalite: "cagridenetleme",
  ornek: "ornekcagri",
  ornekcagri: "ornekcagri",
  "ornek-cagri": "ornekcagri",
  motivasyon: "ornekcagri",
  insiyatif: "insiyatif",
  "insiyatif-calisma": "insiyatif",
};

export function resolveTelegramReportCommand(name: string) {
  return COMMAND_ALIASES[name] ?? null;
}

function parseCommand(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [rawCommand, ...rest] = trimmed.split(/\s+/);
  const command = rawCommand.replace(/^\//, "").split("@")[0]?.toLowerCase() ?? "";
  return { command, arg: rest.join(" ").trim() };
}

async function askForDate(chatId: number, command: ReportCommand) {
  pendingByChat.set(String(chatId), { command, askedAt: Date.now() });
  const title = REPORT_COMMANDS[command].title;
  await sendTelegramMessage(chatId, `${title} raporu için ${DATE_PROMPT}`);
}

async function sendReport(chatId: number, command: ReportCommand, rawRange: string) {
  const range = parseTelegramDateRange(rawRange);
  if (!range) {
    await sendTelegramMessage(
      chatId,
      "Tarihi anlayamadım. Örnek: 22.08.2026 veya 01.08.2026 - 22.08.2026\nTekrar deneyin veya /iptal yazın.",
    );
    return false;
  }

  await sendTelegramMessage(chatId, "Rapor hazırlanıyor…");
  try {
    const report = await buildTelegramReport(command, range.from, range.to);
    if (report.count === 0) {
      await sendTelegramMessage(chatId, `${report.title} için ${report.label} aralığında kayıt yok.`);
      return true;
    }

    await sendTelegramDocument({
      chatId,
      filename: report.filename,
      buffer: report.buffer,
      caption: `${report.title}\nTarih: ${report.label}\nKayıt: ${report.count}`,
    });
    return true;
  } catch (error) {
    console.error("[telegram-report]", error);
    await sendTelegramMessage(chatId, "Rapor hazırlanırken bir hata oluştu. Lütfen tekrar deneyin.");
    return true;
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (!telegramEnabled()) return;
  const message = update.message;
  const text = message?.text?.trim();
  const chatId = message?.chat.id;
  if (!text || chatId == null) return;

  if (!isAllowedTelegramChat(chatId)) {
    console.warn("[telegram] yetkisiz sohbet", chatId);
    await sendTelegramMessage(chatId, "Bu bot yalnızca yetkili hesaplar içindir.");
    return;
  }

  const parsed = parseCommand(text);
  if (parsed?.command === "start" || parsed?.command === "help" || parsed?.command === "yardim") {
    pendingByChat.delete(String(chatId));
    await sendTelegramMessage(chatId, START_TEXT);
    return;
  }

  if (parsed?.command === "iptal" || parsed?.command === "cancel") {
    pendingByChat.delete(String(chatId));
    await sendTelegramMessage(chatId, "İşlem iptal edildi.");
    return;
  }

  if (parsed) {
    const reportCommand = COMMAND_ALIASES[parsed.command];
    if (!reportCommand) {
      await sendTelegramMessage(chatId, "Bu komutu tanımadım. Komut listesi için /start yazın.");
      return;
    }
    if (parsed.arg) {
      pendingByChat.delete(String(chatId));
      const ok = await sendReport(chatId, reportCommand, parsed.arg);
      if (!ok) {
        pendingByChat.set(String(chatId), { command: reportCommand, askedAt: Date.now() });
      }
      return;
    }
    await askForDate(chatId, reportCommand);
    return;
  }

  const pending = pendingByChat.get(String(chatId));
  if (!pending) {
    await sendTelegramMessage(chatId, "Komut listesi için /start yazın.");
    return;
  }
  if (Date.now() - pending.askedAt > PENDING_MS) {
    pendingByChat.delete(String(chatId));
    await sendTelegramMessage(chatId, "Süre doldu. Lütfen komutu yeniden gönderin.");
    return;
  }

  const ok = await sendReport(chatId, pending.command, text);
  if (ok) pendingByChat.delete(String(chatId));
}
