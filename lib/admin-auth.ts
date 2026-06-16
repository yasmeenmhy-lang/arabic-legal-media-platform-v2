import { cookies } from "next/headers";
import { createHash } from "crypto";

export const ADMIN_COOKIE_NAME = "admin_session";

// Demo-grade default so the page works out of the box; set ADMIN_PASSWORD in
// the environment to use a real password in any non-local deployment.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";

export function getAdminSessionToken() {
  return createHash("sha256").update(`admin-dashboard:${ADMIN_PASSWORD}`).digest("hex");
}

export function isAdminPasswordValid(password: string) {
  return password.length > 0 && password === ADMIN_PASSWORD;
}

export function isAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(token) && token === getAdminSessionToken();
}
