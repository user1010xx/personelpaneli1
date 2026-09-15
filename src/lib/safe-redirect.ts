/** Allow only same-app relative paths after login. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes(":")) return fallback;
  return trimmed;
}

export const WELCOME_TRANSITION_KEY = "panel-welcome-transition";

export function withWelcomeTransition(path: string) {
  const url = new URL(path, "http://panel.local");
  url.searchParams.set("welcome", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
