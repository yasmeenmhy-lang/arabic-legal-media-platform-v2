import { NextRequest, NextResponse } from "next/server";
import { signNafathSession } from "@/lib/nafath-auth";
import { getNafathConfiguration } from "@/lib/nafath-config";

export async function GET(request: NextRequest) {
  const config = getNafathConfiguration();
  if (!config.enabled) {
    return NextResponse.redirect(new URL("/login?nafath=pending-official-activation", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("nafath_oauth_state")?.value;
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?nafath=configuration-error", request.url));
  }

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    }),
    cache: "no-store"
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/login?nafath=token-error", request.url));
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return NextResponse.redirect(new URL("/login?nafath=token-error", request.url));

  const userResponse = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store"
  });
  if (!userResponse.ok) return NextResponse.redirect(new URL("/login?nafath=user-error", request.url));
  const profile = await userResponse.json() as { sub?: string; name?: string; role?: string };
  const role = profile.role === "ADMIN" || profile.role === "DIRECTOR" ? profile.role : "LAWYER";
  const response = NextResponse.redirect(new URL("/content-center", request.url));
  response.cookies.set("nafath_session", signNafathSession({ id: profile.sub, name: profile.name, role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
  response.cookies.delete("nafath_oauth_state");
  return response;
}
