import { z } from "zod";
import { badRequest, forbidden, ok } from "@/lib/api";
import { DIRECTOR_COOKIE_NAME, getDirectorSessionToken, isDirectorPasswordValid } from "@/lib/director-auth";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("يرجى إدخال كلمة المرور");
  if (!isDirectorPasswordValid(parsed.data.password)) return forbidden("كلمة المرور غير صحيحة");
  const response = ok({ authenticated: true });
  response.cookies.set(DIRECTOR_COOKIE_NAME, getDirectorSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
  return response;
}
