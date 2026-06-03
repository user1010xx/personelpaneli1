import type { Prisma } from "@prisma/client";
import { requireApiAdminFromDb, jsonResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { parseDateInput } from "@/lib/date-parse";

const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const auth = await requireApiAdminFromDb();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const from = parseDateInput(searchParams.get("from"));
  const to = parseDateInput(searchParams.get("to"));
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir: Prisma.SortOrder =
    searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "50"), 1), MAX_PAGE_SIZE);

  const filters: Array<Record<string, unknown>> = [];
  if (search) {
    filters.push({
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);
    filters.push({
      createdAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      },
    });
  }

  const where = filters.length ? { AND: filters } : undefined;

  const orderBy =
    sortBy === "userName"
      ? { userName: sortDir }
      : sortBy === "userRole"
        ? { userRole: sortDir }
        : sortBy === "description"
          ? { description: sortDir }
          : { createdAt: sortDir };

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return jsonResponse({
    rows: rows.map((r) => ({
      id: r.id,
      userName: r.userName,
      userEmail: r.userEmail,
      userRole: r.userRole,
      action: r.action,
      description: r.description,
      moduleKey: r.moduleKey,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
}
