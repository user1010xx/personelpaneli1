import { NextResponse } from "next/server";
import { getTelegramWebhookSecret, telegramEnabled } from "@/lib/telegram/config";
import { handleTelegramUpdate } from "@/lib/telegram/bot";
import type { TelegramUpdate } from "@/lib/telegram/client";

export async function POST(request: Request) {
  if (!telegramEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const secret = getTelegramWebhookSecret();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram-webhook]", error);
    return NextResponse.json({ ok: true });
  }
}
