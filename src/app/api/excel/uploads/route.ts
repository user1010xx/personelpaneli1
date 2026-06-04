import { jsonResponse, requireApiUserFromDb } from "@/lib/api-helpers";
import { listExcelUploads } from "@/lib/excel";

export async function GET() {
  const auth = await requireApiUserFromDb();
  if (auth.error) return auth.error;

  const uploads = await listExcelUploads();
  return jsonResponse({ uploads });
}