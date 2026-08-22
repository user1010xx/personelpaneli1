import type { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyPanelActivity } from "@/lib/telegram/notify";

export type ActivityUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const MODULE_TITLES: Record<string, string> = {
  EGITIM: "Eğitim Geribildirim",
  CALL_FEEDBACK: "Çağrı Geribildirim",
  EXAMPLE_CALL: "Örnek Çağrı ve Motivasyon",
  KALITE: "Çağrı Denetleme",
  INITIATIVE_WORK: "İnsiyatif Çalışma",
  SUGGESTION_REQUEST: "Öneri - Talep",
  USERS: "Kullanıcı Yönetimi",
  LOG: "İşlem Logu",
};

export function moduleTitle(key?: string | null) {
  if (!key) return "Panel";
  return MODULE_TITLES[key] ?? key;
}

export function roleLabel(role: Role) {
  return role === "ADMIN" ? "Admin" : "Kullanıcı";
}

/** İşlem kaydı — ana akışı bloklamaz */
export function logActivity(
  user: ActivityUser,
  action: string,
  description: string,
  options?: { moduleKey?: string; metadata?: Record<string, unknown> },
) {
  void prisma.activityLog
    .create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action,
        description,
        moduleKey: options?.moduleKey ?? null,
        metadata: options?.metadata
          ? (options.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    })
    .then(() => {
      notifyPanelActivity({
        userName: user.name,
        action,
        description,
        metadata: options?.metadata,
      });
    })
    .catch((err) => {
      console.error("[activity-log]", err);
    });
}

export function formatLogTimestamp(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
