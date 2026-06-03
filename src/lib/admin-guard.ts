import { prisma } from "@/lib/db";

export async function countActiveAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      active: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function ensureNotLastActiveAdmin(userId: string, patch: { role?: string; active?: boolean }) {
  const demoting =
    patch.role === "USER" || patch.active === false;
  if (!demoting) return null;

  const others = await countActiveAdmins(userId);
  if (others === 0) {
    return "Sistemde en az bir aktif admin kalmalıdır.";
  }
  return null;
}
