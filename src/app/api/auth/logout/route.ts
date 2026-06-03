import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUserFromDb } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function POST() {
  const user = await getSessionUserFromDb();
  if (user) {
    logActivity(user, "CIKIS", `${user.name} (${user.email}) panelden çıkış yaptı.`);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
