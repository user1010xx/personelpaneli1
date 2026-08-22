import { describe, expect, it } from "vitest";
import { createUserSchema, normalizeEmailInput } from "@/lib/user-validation";

describe("normalizeEmailInput", () => {
  it("fixes Turkish .cım typo to .com", () => {
    expect(normalizeEmailInput("test@gmail.cım")).toBe("test@gmail.com");
  });
});

describe("createUserSchema", () => {
  it("accepts normalized typo email", () => {
    const parsed = createUserSchema.parse({
      name: "Test Kullanıcı",
      email: "test@gmail.cım",
      password: "12345678",
      role: "USER",
    });
    expect(parsed.email).toBe("test@gmail.com");
  });

  it("rejects short password with message", () => {
    expect(() =>
      createUserSchema.parse({
        name: "Test",
        email: "a@b.com",
        password: "123",
      }),
    ).toThrow();
  });
});
