import { createHash } from "crypto";
import { cookies } from "next/headers";

export const DIRECTOR_COOKIE_NAME = "director_session";
const DIRECTOR_PASSWORD = process.env.DIRECTOR_PASSWORD ?? "Director@12345";

export function getDirectorSessionToken() {
  return createHash("sha256").update(`director-dashboard:${DIRECTOR_PASSWORD}`).digest("hex");
}

export function isDirectorPasswordValid(password: string) {
  return password.length > 0 && password === DIRECTOR_PASSWORD;
}

export function isDirectorAuthenticated() {
  return cookies().get(DIRECTOR_COOKIE_NAME)?.value === getDirectorSessionToken();
}
