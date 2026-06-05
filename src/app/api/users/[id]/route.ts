import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireApiAdminFromDb } from "@/lib/api-helpers";
import { ensureNotLastActiveAdmin } from "@/lib/admin-guard";
import { updateUserSchema, zodErrorMessage } from "@/lib/user-validation";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = updateUserSchema.parse(await request.json());

    const guardMsg = await ensureNotLastActiveAdmin(id, {
      role: body.role,
      active: body.active,
    });
    if (guardMsg) {
      return NextResponse.json({ error: guardMsg }, { status: 400 });
    }

    if (body.email) {
      const email = body.email.trim().toLowerCase();
      const clash = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      });
      if (clash) {
        return NextResponse.json({ error: "Bu e-posta başka kullanıcıda kayıtlı" }, { status: 409 });
      }
    }

    const data: {
      name?: string;
      email?: string;
      role?: Role;
      active?: boolean;
      passwordHash?: string;
    } = {};

    if (body.name) data.name = body.name.trim();
    if (body.email) data.email = body.email.trim().toLowerCase();
    if (body.role) data.role = body.role as Role;
    if (typeof body.active === "boolean") data.active = body.active;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    const parts: string[] = [];
    if (body.name) parts.push("ad");
    if (body.email) parts.push("e-posta");
    if (body.role) parts.push("rol");
    if (typeof body.active === "boolean") parts.push(body.active ? "aktif durumu" : "pasif durumu");
    if (body.password) parts.push("şifre");
    logActivity(
      auth.user!,
      "KULLANICI_GUNCELLE",
      `${user.name} (${user.email}) kullanıcısını güncelledi${parts.length ? `: ${parts.join(", ")}` : ""}.`,
      { moduleKey: "USERS", metadata: { targetUserId: user.id } },
    );

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error) }, { status: 400 });
    }
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  const { id } = await params;
  const mode = new URL(request.url).searchParams.get("mode");
  const hardDelete = mode === "hard";
  if (auth.user!.id === id) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
  }

  const guardMsg = await ensureNotLastActiveAdmin(id, { active: false });
  if (guardMsg) {
    return NextResponse.json({ error: guardMsg }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true, role: true, active: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  if (hardDelete) {
    try {
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2003" || error.code === "P2014")
      ) {
        return NextResponse.json(
          {
            error:
              "Bu kullanıcıya bağlı kayıtlar olduğu için silme işlemi tamamlanamadı.",
          },
          { status: 409 },
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
      }
      console.error("[users DELETE]", error);
      return NextResponse.json({ error: "Kullanıcı silinemedi" }, { status: 500 });
    }
    logActivity(
      auth.user!,
      "KULLANICI_SIL",
      `${target.name} (${target.email}) kullanıcısını kalıcı olarak sildi.`,
      { moduleKey: "USERS", metadata: { targetUserId: id } },
    );
    return NextResponse.json({ ok: true, deleted: true });
  }

  await prisma.user.update({ where: { id }, data: { active: false } });

  logActivity(
    auth.user!,
    "KULLANICI_PASIF",
    `${target.name} (${target.email}) kullanıcısını pasifleştirdi.`,
    { moduleKey: "USERS", metadata: { targetUserId: id } },
  );

  return NextResponse.json({ ok: true, deleted: false });
}
