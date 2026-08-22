import {
  getPublicAppUrl,
  getTelegramWebhookSecret,
  telegramEnabled,
} from "@/lib/telegram/config";
import {
  deleteTelegramWebhook,
  getTelegramUpdates,
  setTelegramWebhook,
} from "@/lib/telegram/client";
import { handleTelegramUpdate } from "@/lib/telegram/bot";

const globalForTelegram = globalThis as unknown as {
  telegramBotStarted?: boolean;
};

async function pollForever() {
  let offset = 0;
  for (;;) {
    try {
      const updates = await getTelegramUpdates(offset, 25);
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handleTelegramUpdate(update);
        } catch (error) {
          console.error("[telegram-update]", error);
        }
      }
    } catch (error) {
      console.error("[telegram-poll]", error);
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }
}

export async function startTelegramBot() {
  if (!telegramEnabled()) return;
  if (globalForTelegram.telegramBotStarted) return;
  globalForTelegram.telegramBotStarted = true;

  const publicUrl = getPublicAppUrl();
  if (publicUrl) {
    try {
      await setTelegramWebhook(`${publicUrl}/api/telegram/webhook`, getTelegramWebhookSecret());
      console.info("[telegram] webhook ayarlandı", `${publicUrl}/api/telegram/webhook`);
      return;
    } catch (error) {
      console.error("[telegram] webhook kurulamadı, polling'e geçiliyor", error);
    }
  }

  try {
    await deleteTelegramWebhook();
  } catch {
    /* webhook yoksa devam */
  }
  console.info("[telegram] polling başladı");
  void pollForever();
}
