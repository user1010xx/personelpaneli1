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
    const row = await prisma.rateLimitEntry.findUnique({ where: { key } });

    if (!row || row.windowEnds <= now) {
      await prisma.rateLimitEntry.upsert({
        where: { key },
        create: { key, hits: 1, windowEnds: windowEnd },
        update: { hits: 1, windowEnds: windowEnd },
      });
      return { ok: true };
    }

    if (row.hits >= maxAttempts) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((row.windowEnds.getTime() - now.getTime()) / 1000)),
      };
    }

    await prisma.rateLimitEntry.update({
      where: { key },
      data: { hits: row.hits + 1 },
    });
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
