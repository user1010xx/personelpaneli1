import type { SessionUser } from "@/types/auth";

/** Giriş yapmış tüm kullanıcılar operasyonel kayıtları düzenleyebilir */
export function canModifyRecord(user: SessionUser, _createdById: string) {
  return user.role === "ADMIN" || user.role === "USER";
}
