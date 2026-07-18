import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isDatabaseConfigured, readSessionFromCookies } from "@/lib/access-auth";
import { findUserByUsername, setUserPasswordHash } from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// تغيير كلمة السر الذاتي — للمستخدم الداخل فقط، ويتطلب معرفة الرمز الحالي.
// جلسته الحالية تبقى سارية (لا تُنهى جلسات المستخدم) — فقط الرمز يتغيّر.
export async function POST(request: Request) {
  const session = readSessionFromCookies();
  if (!session) return NextResponse.json({ error: "الجلسة غير صالحة — سجّل الدخول من جديد." }, { status: 401 });

  if (session.role === "admin") {
    return NextResponse.json(
      { error: "بيانات المدير تُدار عبر متغيرات البيئة — لا يمكن تغييرها من هنا." },
      { status: 400 }
    );
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { currentCode?: string; newCode?: string } | null;
  const currentCode = body?.currentCode ?? "";
  const newCode = body?.newCode ?? "";
  if (!currentCode || newCode.length < 8) {
    return NextResponse.json({ error: "الرمز الحالي مطلوب، والرمز الجديد ٨ أحرف على الأقل." }, { status: 400 });
  }

  try {
    const user = await findUserByUsername(session.username);
    if (!user) return NextResponse.json({ error: "تعذر العثور على الحساب." }, { status: 404 });
    const ok = await bcrypt.compare(currentCode, user.password_hash).catch(() => false);
    if (!ok) return NextResponse.json({ error: "الرمز الحالي غير صحيح." }, { status: 401 });

    const newHash = await bcrypt.hash(newCode, 10);
    await setUserPasswordHash(user.id, newHash, false);
    return NextResponse.json({ ok: true, message: "تم تغيير رمز الدخول بنجاح." });
  } catch {
    return NextResponse.json({ error: "تعذر تغيير الرمز — حاول مرة أخرى." }, { status: 500 });
  }
}
