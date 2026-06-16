import { z } from "zod";
import { badRequest, forbidden, ok } from "@/lib/api";
import { ADMIN_COOKIE_NAME, getAdminSessionToken, isAdminPasswordValid } from "@/lib/admin-auth";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("يرجى إدخال كلمة المرور");
  if (!isAdminPasswordValid(parsed.data.password)) return forbidden("كلمة المرور غير صحيحة");

  const response = ok({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE_NAME, getAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
  return response;
}
