import { describe, expect, it } from "vitest";
import { safeNextPath, withWelcomeTransition } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("allows relative paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/egitim")).toBe("/egitim");
  });

  it("blocks external redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
  });

  it("uses fallback when empty", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});

describe("withWelcomeTransition", () => {
  it("adds the welcome marker while preserving query and hash", () => {
    expect(withWelcomeTransition("/dashboard")).toBe("/dashboard?welcome=1");
    expect(withWelcomeTransition("/kalite?from=2026-09-15#liste")).toBe(
      "/kalite?from=2026-09-15&welcome=1#liste",
    );
    expect(withWelcomeTransition("/dashboard?welcome=0")).toBe("/dashboard?welcome=1");
  });
});
