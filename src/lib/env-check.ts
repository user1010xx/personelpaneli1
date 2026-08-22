export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("Production requires JWT_SECRET with at least 32 characters.");
  }

  if (secret === "change-me-in-production-use-long-random-string") {
    throw new Error("JWT_SECRET must not use the example default in production.");
  }
}
