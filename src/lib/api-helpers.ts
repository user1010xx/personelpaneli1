import { NextResponse } from "next/server";
import type { Period } from "@/lib/date-ranges";
import { getSessionUserFromDb } from "@/lib/auth";

/** DB-backed API guard — pasif kullanıcı ve rol değişiklikleri anında yansır */
export async function requireApiUser() {
  const user = await getSessionUserFromDb();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Yetkisiz" }, { status: 401 }) };
  }
  return { user, error: null };
}

/** DB — kullanıcı devre dışı / rol değişimi anında yansısın */
export async function requireApiUserFromDb() {
  return requireApiUser();
}

export async function requireApiAdmin() {
  const result = await requireApiUser();
  if (result.error) return result;
  if (result.user!.role !== "ADMIN") {
    return {
      user: null,
      error: NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireApiAdminFromDb() {
  const result = await requireApiUserFromDb();
  if (result.error) return result;
  if (result.user!.role !== "ADMIN") {
    return {
      user: null,
      error: NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 }),
    };
  }
  return result;
}

export function parsePeriod(value: string | null): Period {
  if (value === "weekly" || value === "monthly") return value;
  return "daily";
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/** @deprecated use jsonResponse */
export function jsonCache(data: unknown, status = 200) {
  return jsonResponse(data, status);
}

import { parseDateInput } from "@/lib/date-parse";

/** @deprecated alias — use parseDateInput */
export function parseDate(value: string | null) {
  return parseDateInput(value);
}

export { toDateRange } from "@/lib/date-parse";
