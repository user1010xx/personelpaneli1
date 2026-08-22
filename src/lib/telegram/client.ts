import { getTelegramBotToken } from "@/lib/telegram/config";

const API = "https://api.telegram.org";

function apiUrl(method: string) {
  return `${API}/bot${getTelegramBotToken()}/${method}`;
}

async function callTelegram<T>(method: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(json.description ?? `Telegram ${method} failed`);
  }
  return json.result as T;
}

export async function sendTelegramMessage(chatId: string | number, text: string) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function sendTelegramDocument(params: {
  chatId: string | number;
  filename: string;
  buffer: Uint8Array;
  caption?: string;
}) {
  const form = new FormData();
  form.append("chat_id", String(params.chatId));
  const bytes = Uint8Array.from(params.buffer);
  form.append(
    "document",
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    params.filename,
  );
  if (params.caption) form.append("caption", params.caption.slice(0, 1024));

  const res = await fetch(apiUrl("sendDocument"), { method: "POST", body: form });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) {
    throw new Error(json.description ?? "Telegram sendDocument failed");
  }
}

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string };
  };
};

export async function getTelegramUpdates(offset: number, timeoutSec = 25) {
  return callTelegram<TelegramUpdate[]>("getUpdates", {
    offset,
    timeout: timeoutSec,
    allowed_updates: ["message"],
  });
}

export async function setTelegramWebhook(url: string, secret: string) {
  return callTelegram("setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
}

export async function deleteTelegramWebhook() {
  return callTelegram("deleteWebhook", { drop_pending_updates: false });
}
