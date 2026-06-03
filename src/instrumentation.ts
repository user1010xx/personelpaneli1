export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionEnv } = await import("@/lib/env-check");
    const { ensureAdminSeed } = await import("@/lib/auth");
    assertProductionEnv();
    await ensureAdminSeed();
  }
}
