import type { RoleName } from "@/lib/types";

export const rolePermissions: Record<RoleName, string[]> = {
  LAWYER: [
    "dashboard:view",
    "content:manage",
    "content:review",
    "publishing:manage",
    "campaigns:manage",
    "analytics:view",
    "recommendations:view",
    "alerts:view"
  ],
  SUPERVISOR: [
    "dashboard:view",
    "content:review",
    "analytics:view",
    "sector:view",
    "recommendations:view",
    "alerts:view"
  ],
  ADMIN: ["*"]
};

export function can(role: RoleName, permission: string) {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function assertPermission(role: RoleName, permission: string) {
  if (!can(role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export const demoSession = {
  user: {
    id: "demo-lawyer",
    name: "أحمد الحربي",
    role: "LAWYER" as RoleName
  }
};
