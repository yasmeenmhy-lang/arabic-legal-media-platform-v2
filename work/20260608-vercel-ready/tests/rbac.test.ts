import { describe, expect, it } from "vitest";
import { can } from "@/lib/rbac";

describe("RBAC", () => {
  it("allows supervisors to view aggregated sector analytics", () => {
    expect(can("SUPERVISOR", "sector:view")).toBe(true);
  });

  it("prevents lawyers from viewing supervisor-only sector analytics", () => {
    expect(can("LAWYER", "sector:view")).toBe(false);
  });

  it("allows administrators to perform any permission", () => {
    expect(can("ADMIN", "admin:manage")).toBe(true);
    expect(can("ADMIN", "sector:view")).toBe(true);
  });
});
