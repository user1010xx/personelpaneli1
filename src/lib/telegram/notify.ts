import { formatTelegramDateTime } from "@/lib/telegram/dates";
import { getTelegramNotifyChatId, telegramEnabled } from "@/lib/telegram/config";
import { sendTelegramMessage } from "@/lib/telegram/client";

type Meta = Record<string, unknown> | null | undefined;

function str(meta: Meta, key: string) {
  const value = meta?.[key];
  if (value == null) return "";
  return String(value).trim();
}

function joinNote(parts: Array<string | number | null | undefined>) {
  const clean = parts.map((part) => (part == null ? "" : String(part).trim())).filter(Boolean);
  return clean.length ? clean.join(" - ") : "";
}

export function formatPanelActivityMessage(input: {
  userName: string;
  at?: Date;
  action: string;
  description: string;
  metadata?: Meta;
}) {
  const meta = input.metadata ?? {};
  const personel = str(meta, "personelName");
  const phone = str(meta, "phone");
  const score = str(meta, "score");
  const topic = str(meta, "topic");
  const trainer = str(meta, "trainer");
  const subject = str(meta, "subject");
  const type = str(meta, "type");

  let islem = input.description;
  let note = "";

  switch (input.action) {
    case "CAGRI_DENETLEME_EKLE":
      islem = `${personel || "Personel"} çağrı denetlemesi sağlanıp puanlandı`;
      note = joinNote([personel, phone, score ? `${score} Puan` : null, str(meta, "note")]);
      break;
    case "CAGRI_DENETLEME_GUNCELLE":
      islem = `${personel || "Personel"} çağrı denetlemesi güncellendi`;
      note = joinNote([personel, phone, score ? `${score} Puan` : null]);
      break;
    case "CAGRI_DENETLEME_SIL":
      islem = `${personel || "Personel"} çağrı denetlemesi silindi`;
      note = joinNote([personel, score ? `${score} Puan` : null]);
      break;
    case "EGITIM_EKLE":
      islem = `${personel || "Personel"} eğitim kaydı eklendi`;
      note = joinNote([personel, topic, trainer, str(meta, "recordDate")]);
      break;
    case "EGITIM_GUNCELLE":
      islem = `${personel || "Personel"} eğitim kaydı güncellendi`;
      note = joinNote([personel, topic, trainer]);
      break;
    case "CAGRI_GERIBILDIRIM_EKLE":
      islem = `${personel || "Personel"} çağrı geribildirimi eklendi`;
      note = joinNote([personel, topic, trainer, str(meta, "recordDate")]);
      break;
    case "CAGRI_GERIBILDIRIM_GUNCELLE":
      islem = `${personel || "Personel"} çağrı geribildirimi güncellendi`;
      note = joinNote([personel, topic, trainer]);
      break;
    case "ORNEK_CAGRI_EKLE": {
      const alan = str(meta, "recordType") === "MOTIVASYON" ? "motivasyon" : "örnek çağrı";
      islem = `${personel || "Personel"} ${alan} kaydı ekledi`;
      note = joinNote([
        personel,
        str(meta, "recordType") === "MOTIVASYON" ? "Motivasyon" : phone,
        str(meta, "recordDate"),
      ]);
      break;
    }
    case "ORNEK_CAGRI_GUNCELLE":
      islem = `${personel || "Personel"} örnek çağrı / motivasyon güncellendi`;
      note = joinNote([personel, str(meta, "recordType") === "MOTIVASYON" ? "Motivasyon" : phone]);
      break;
    case "ORNEK_CAGRI_SIL":
      islem = `${personel || "Personel"} örnek çağrı / motivasyon silindi`;
      note = joinNote([personel, str(meta, "recordType") === "MOTIVASYON" ? "Motivasyon" : phone]);
      break;
    case "BILGI_DUELLOSU_EKLE": {
      const sonuc = str(meta, "result") === "YANLIS" ? "Yanlış" : "Doğru";
      islem = `${personel || "Personel"} bilgi duellosu kaydı eklendi`;
      note = joinNote([personel, sonuc, str(meta, "recordDate")]);
      break;
    }
    case "BILGI_DUELLOSU_GUNCELLE": {
      const sonuc = str(meta, "result") === "YANLIS" ? "Yanlış" : str(meta, "result") === "DOGRU" ? "Doğru" : "";
      islem = `${personel || "Personel"} bilgi duellosu güncellendi`;
      note = joinNote([personel, sonuc]);
      break;
    }
    case "BILGI_DUELLOSU_SIL": {
      const sonuc = str(meta, "result") === "YANLIS" ? "Yanlış" : str(meta, "result") === "DOGRU" ? "Doğru" : "";
      islem = `${personel || "Personel"} bilgi duellosu silindi`;
      note = joinNote([personel, sonuc]);
      break;
    }
    case "INSIYATIF_CALISMA_EKLE":
      islem = `${personel || "Personel"} insiyatif çalışma kaydı eklendi`;
      note = joinNote([
        personel,
        str(meta, "recordDate"),
        str(meta, "callCount") ? `${str(meta, "callCount")} arama` : null,
        str(meta, "memberCount") ? `${str(meta, "memberCount")} üye` : null,
      ]);
      break;
    case "INSIYATIF_CALISMA_GUNCELLE":
      islem = `${personel || "Personel"} insiyatif çalışma kaydı güncellendi`;
      note = joinNote([personel]);
      break;
    case "INSIYATIF_CALISMA_SIL":
      islem = `${personel || "Personel"} insiyatif çalışma kaydı silindi`;
      note = joinNote([personel]);
      break;
    case "ONERI_TALEP_EKLE":
      islem = `${type === "TALEP" ? "Talep" : type === "ONERI" ? "Öneri" : "Öneri/Talep"} eklendi`;
      note = joinNote([str(meta, "reporterName"), subject]);
      break;
    case "ONERI_TALEP_GUNCELLE":
      islem = "Öneri/Talep güncellendi";
      note = joinNote([subject]);
      break;
    case "ONERI_TALEP_SIL":
      islem = "Öneri/Talep silindi";
      note = joinNote([subject]);
      break;
    case "GIRIS":
      islem = "Panele giriş yaptı";
      break;
    case "CIKIS":
      islem = "Panelden çıkış yaptı";
      break;
    default:
      islem = input.description;
      note = str(meta, "note");
  }

  const lines = [
    `Kullanıcı : ${input.userName}`,
    `Tarih saat : ${formatTelegramDateTime(input.at ?? new Date())}`,
    `İşlem : ${islem}`,
  ];
  if (note) lines.push(`Not : ${note}`);
  return lines.join("\n");
}

export function notifyPanelActivity(input: {
  userName: string;
  action: string;
  description: string;
  metadata?: Meta;
}) {
  if (!telegramEnabled()) return;
  const chatId = getTelegramNotifyChatId();
  if (!chatId) return;

  const text = formatPanelActivityMessage({
    ...input,
    at: new Date(),
  });

  void sendTelegramMessage(chatId, text).catch((error) => {
    console.error("[telegram-notify]", error);
  });
}
