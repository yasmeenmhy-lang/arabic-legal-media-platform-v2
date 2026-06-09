import bcrypt from "bcryptjs";
import type { RoleName } from "@/lib/types";
import { can, demoSession } from "@/lib/rbac";

export type AppSession = {
  user: {
    id: string;
    name: string;
    role: RoleName;
  };
};

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function getCurrentSession(): Promise<AppSession> {
  return demoSession;
}

export async function requirePermission(permission: string) {
  const session = await getCurrentSession();
  if (!can(session.user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
