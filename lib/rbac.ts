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
  DIRECTOR: [
    "dashboard:view",
    "analytics:view",
    "management-analytics:view",
    "reports:download"
  ],
  ADMIN: ["*"]
};

export const rbacRoles = [
  {
    name: "محام",
    description: "مراجعة المحتوى ومتابعة جاهزية النشر والتصدير",
    permissions: rolePermissions.LAWYER
  },
  {
    name: "الأدمن",
    description: "إدارة الإعدادات والمصادر والصلاحيات",
    permissions: rolePermissions.ADMIN
  },
  {
    name: "مدير الإدارة العامة للمحاماة",
    description: "الاطلاع على المؤشرات القيادية والتحليلية المجمعة",
    permissions: rolePermissions.DIRECTOR
  }
];

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
    name: "أحمد عبدالعزيز",
    role: "LAWYER" as RoleName
  }
};
