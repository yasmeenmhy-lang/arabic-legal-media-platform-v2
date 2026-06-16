import { ok } from "@/lib/api";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function POST() {
  const response = ok({ authenticated: false });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
