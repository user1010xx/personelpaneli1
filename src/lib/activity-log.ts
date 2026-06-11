import type { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ActivityUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const MODULE_TITLES: Record<string, string> = {
  PERSONEL: "Personel",
  PUANTAJ: "Puantaj",
  WHATSAPP: "WhatsApp Süreci",
  UYARI_KESINTI: "Uyarı Kesinti",
  UYE_ADEDI: "Üye Adedi",
  CAGRI_SURECI: "Çağrı Süreci",
  EGITIM: "Eğitim Geribildirim",
  KALITE: "Kalite Puanlaması",
  INITIATIVE_WORK: "İnsiyatif Çalışma",
  USERS: "Kullanıcı Yönetimi",
  PERSONEL_ALIAS: "Personel Eşleştirme",
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
