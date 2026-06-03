import { requireApiUser, jsonResponse } from "@/lib/api-helpers";
import { getPanelDataRevision } from "@/lib/panel-revision";

/** Panel verisinin ortak revizyonu — admin/user aynı kaynaktan okur */
export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const payload = await getPanelDataRevision();
  return jsonResponse(payload);
}
