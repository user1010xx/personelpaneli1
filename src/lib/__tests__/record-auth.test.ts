import { describe, expect, it } from "vitest";
import { canModifyRecord } from "@/lib/record-auth";

describe("canModifyRecord", () => {
  const admin = { id: "a1", name: "Admin", email: "a@x.com", role: "ADMIN" as const };
  const user = { id: "u1", name: "User", email: "u@x.com", role: "USER" as const };

  it("allows admin always", () => {
    expect(canModifyRecord(admin, "other")).toBe(true);
  });

  it("allows user to edit any operational record", () => {
    expect(canModifyRecord(user, "u1")).toBe(true);
    expect(canModifyRecord(user, "other")).toBe(true);
  });
});
