import { NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/api-helpers";
import { createUserSchema, zodErrorMessage } from "@/lib/user-validation";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const body = createUserSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash: await hashPassword(body.password),
        role: (body.role as Role) ?? "USER",
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    logActivity(
      auth.user!,
      "KULLANICI_EKLE",
      `Yeni kullanıcı ekledi: ${user.name} (${user.email}), rol: ${user.role === "ADMIN" ? "Admin" : "Kullanıcı"}.`,
      { moduleKey: "USERS", metadata: { targetUserId: user.id } },
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error) }, { status: 400 });
    }
    return NextResponse.json({ error: "Kullanıcı oluşturulamadı" }, { status: 500 });
  }
}
