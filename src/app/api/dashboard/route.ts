import { getDashboardData } from "@/lib/dashboard";
import { jsonResponse, parseDate, requireApiUser } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const data = await getDashboardData({
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
    search: searchParams.get("search") ?? undefined,
  });

  return jsonResponse(data);
}
