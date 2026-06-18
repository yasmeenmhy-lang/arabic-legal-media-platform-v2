import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { RoleName } from "@/lib/types";
import { can, demoSession } from "@/lib/rbac";
import { verifyNafathSession } from "@/lib/nafath-auth";

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
  const nafath = verifyNafathSession(cookies().get("nafath_session")?.value);
  if (nafath?.id && nafath?.name && nafath?.role) {
    return {
      user: {
        id: String(nafath.id),
        name: String(nafath.name),
        role: nafath.role as RoleName
      }
    };
  }
  return demoSession;
}

export async function requirePermission(permission: string) {
  const session = await getCurrentSession();
  if (!can(session.user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
