import { NextResponse } from "next/server";
import { z } from "zod";
import { ackDb, recordAcknowledgment } from "@/lib/acknowledgments";
import { readSessionFromCookies } from "@/lib/access-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// تسجيل واقعة الإقرار قبل النشر — سند إثباتي دائم (بقرار مالكة المنصة).
// هوية المُقِرّ تُؤخذ من الجلسة المُوثَّقة (لا من قيمة يرسلها العميل، فلا تُنتحل).
const schema = z.object({
  contentId: z.string().max(200).optional(),
  version: z.number().int().nonnegative().optional(),
  riskLevel: z.string().max(20).optional(),
  tier: z.enum(["low", "medium"]).optional(),
  affectedParties: z.array(z.string().max(40)).max(5).optional(),
  ackText: z.string().min(10).max(4000),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const sql = ackDb();
  // لا قاعدة بيانات (تشغيل محلي): العميل يحتفظ بنسخته المحلية — لا نُسقط النشر
  if (!sql) return NextResponse.json({ ok: true, stored: false });

  let username: string | null = null;
  try { username = readSessionFromCookies()?.username ?? null; } catch { username = null; }

  const d = parsed.data;
  try {
    await recordAcknowledgment(sql, {
      id: crypto.randomUUID(),
      username,
      contentId: d.contentId ?? null,
      version: d.version ?? null,
      riskLevel: d.riskLevel ?? null,
      tier: d.tier ?? null,
      affectedParties: d.affectedParties?.length ? JSON.stringify(d.affectedParties) : null,
      ackText: d.ackText,
    });
    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("[acknowledgments]", error);
    return NextResponse.json({ ok: false, stored: false }, { status: 500 });
  }
}
