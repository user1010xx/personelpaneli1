import type { SessionUser } from "@/types/auth";

/** Operasyonel kayıtları yalnızca admin veya kaydı oluşturan kullanıcı düzenleyebilir */
export function canModifyRecord(user: SessionUser, createdById: string) {
  return user.role === "ADMIN" || user.id === createdById;
}
