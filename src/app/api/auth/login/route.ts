import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const limit = await checkRateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Çok fazla deneme. ${limit.retryAfterSec} saniye sonra tekrar deneyin.` },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Geçersiz e-posta veya şifre" }, { status: 401 });
    }

    const valid = await verifyPassword(body.password.trim(), user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Geçersiz e-posta veya şifre" }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    logActivity(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      "GIRIS",
      `${user.name} (${user.email}) panele giriş yaptı.`,
    );

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }
    console.error("[login]", error);
    return NextResponse.json({ error: "Giriş başarısız" }, { status: 500 });
  }
}
