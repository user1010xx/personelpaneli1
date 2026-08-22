export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function getTelegramNotifyChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim() || "";
}

export function getTelegramWebhookSecret() {
  return (
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim()?.slice(0, 48) ||
    ""
  );
}

export function getPublicAppUrl() {
  const raw =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
    "";
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function telegramEnabled() {
  return Boolean(getTelegramBotToken());
}

export function isAllowedTelegramChat(chatId: string | number) {
  const id = String(chatId);
  const notify = getTelegramNotifyChatId();
  const extra = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowed = new Set([notify, ...extra].filter(Boolean));
  if (allowed.size === 0) return true;
  return allowed.has(id);
}
