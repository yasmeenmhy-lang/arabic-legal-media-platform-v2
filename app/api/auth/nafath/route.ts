import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getNafathConfiguration } from "@/lib/nafath-config";

export async function GET() {
  const config = getNafathConfiguration();
  if (!config.enabled) {
    return NextResponse.json({
      error: "قيد التفعيل بعد استكمال الربط الرسمي",
      externalDependency: true
    }, { status: 503 });
  }

  const state = randomUUID();
  const url = new URL(config.authorizationUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  const response = NextResponse.redirect(url);
  response.cookies.set("nafath_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  });
  return response;
}
