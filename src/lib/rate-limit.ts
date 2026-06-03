import { prisma } from "@/lib/db";

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowMs);
    const rows = await prisma.$queryRaw<{ hits: number; windowEnds: Date }[]>`
      INSERT INTO "RateLimitEntry" ("key", "hits", "windowEnds")
      VALUES (${key}, 1, ${windowEnd})
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE
          WHEN "RateLimitEntry"."windowEnds" <= ${now} THEN 1
          ELSE "RateLimitEntry"."hits" + 1
        END,
        "windowEnds" = CASE
          WHEN "RateLimitEntry"."windowEnds" <= ${now} THEN ${windowEnd}
          ELSE "RateLimitEntry"."windowEnds"
        END
      RETURNING "hits", "windowEnds"
    `;
    const row = rows[0];
    if (!row) return { ok: true };

    if (Math.random() < 0.01) {
      void prisma.rateLimitEntry
        .deleteMany({ where: { windowEnds: { lt: now } } })
        .catch(() => undefined);
    }

    if (row.hits > maxAttempts) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((row.windowEnds.getTime() - now.getTime()) / 1000)),
      };
    }
    return { ok: true };
  } catch {
    return checkRateLimitMemory(key, maxAttempts, windowMs);
  }
}

function checkRateLimitMemory(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= maxAttempts) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}
