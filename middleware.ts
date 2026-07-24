import { NextResponse, type NextRequest } from "next/server";
import { can, demoSession } from "@/lib/rbac";

// ── نظام الدخول الفردي (بقرار مالكة المنصة) ─────────────────────────────────
// حماية من جهة الخادم لكل الصفحات وواجهات API — إخفاء الرابط لا يكفي.
// لا يُفعَّل إلا باكتمال متغيرات البيئة الثلاثة (AUTH_SECRET, ADMIN_USERNAME,
// ADMIN_PASSWORD_HASH) — قبلها تعمل المنصة كما هي، فالنشر آمن على مراحل.
// ملاحظة تصميم: middleware يتحقق من توقيع الجلسة ودورها (بيئة Edge — Web Crypto)،
// والتحقق من حياة الجلسة في قاعدة البيانات يتم في واجهات API نفسها وفي نبض النشاط.

const SESSION_COOKIE = "lm_session";

// مسارات عامة لا تتطلب جلسة (صفحة الدخول ومدخلاها: الدخول والتسجيل الذاتي)
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register", "/api/auth/me"];

function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH);
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface EdgeSession { role: "admin" | "user"; }

// نفس صيغة lib/access-auth: v1|sessionId|role|username-base64|expiresAt|hmac
async function verifySessionEdge(token: string | undefined): Promise<EdgeSession | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return null;
  const parts = token.split("|");
  if (parts.length !== 6 || parts[0] !== "v1") return null;
  const body = parts.slice(0, 5).join("|");
  const expected = await hmacHex(secret, body);
  if (expected !== parts[5]) return null;
  const role = parts[2];
  if (role !== "admin" && role !== "user") return null;
  const expiresAt = Number(parts[4]);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return { role };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isAuthConfigured()) {
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const session = await verifySessionEdge(request.cookies.get(SESSION_COOKIE)?.value);

    if (!isPublic) {
      if (!session) {
        if (isApi) {
          return NextResponse.json({ error: "الدخول مطلوب" }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        return NextResponse.redirect(url);
      }
      // لوحة إدارة الوصول وواجهاتها للأدمن حصراً — محاولة مستخدم عادي تُمنع ويُعاد توجيهه
      const adminOnly = pathname.startsWith("/admin/access") || pathname.startsWith("/api/access-admin");
      if (adminOnly && session.role !== "admin") {
        if (isApi) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    } else if (pathname === "/login" && session) {
      // من لديه جلسة صالحة لا يحتاج صفحة الدخول — يُحوَّل للتطبيق مباشرة
      const url = request.nextUrl.clone();
      url.pathname = session.role === "admin" ? "/admin/access" : "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // ── منطق RBAC التجريبي القائم — يبقى كما هو ──────────────────────────────
  const protectedRoutes: Array<{ prefix: string; permission: string }> = [
    { prefix: "/content-review", permission: "content:review" }
  ];
  const route = protectedRoutes.find((item) => pathname.startsWith(item.prefix));
  if (route && !can(demoSession.user.role, route.permission)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("denied", route.permission);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|xml|json)$).*)"]
};
