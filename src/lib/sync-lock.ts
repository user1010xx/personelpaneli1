import { prisma } from "@/lib/db";

const localLocks = new Set<string>();

function lockId(moduleKey: string): bigint {
  let hash = 0;
  for (let i = 0; i < moduleKey.length; i++) {
    hash = (hash * 31 + moduleKey.charCodeAt(i)) | 0;
  }
  return BigInt(Math.abs(hash) + 1);
}

/**
 * Modül başına senkron/upload kilidi.
 * PostgreSQL advisory lock (çok instance) + process-local Set (aynı process).
 */
export async function withModuleLock<T>(moduleKey: string, fn: () => Promise<T>): Promise<T> {
  if (localLocks.has(moduleKey)) {
    throw new Error("Bu modül için senkronizasyon zaten çalışıyor. Lütfen bekleyin.");
  }
  localLocks.add(moduleKey);
  const id = lockId(moduleKey);
  let locked = false;

  try {
    const result = await prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${id}) AS locked
    `;
    locked = Boolean(result[0]?.locked);
    if (!locked) {
      throw new Error("Bu modül için senkronizasyon zaten çalışıyor. Lütfen bekleyin.");
    }
    return await fn();
  } finally {
    if (locked) {
      await prisma.$executeRaw`SELECT pg_advisory_unlock(${id})`;
    }
    localLocks.delete(moduleKey);
  }
}
