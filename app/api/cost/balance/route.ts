import { NextResponse } from "next/server";
import { z } from "zod";
import { readSessionFromCookies } from "@/lib/access-auth";
import { getBalanceUsd, setBalanceUsd, ledgerDb } from "@/lib/cost-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// دفتر الرصيد الداخلي — لمالكة المنصة (دور admin) وحدها: قراءة الرصيد وتحديثه عند الشحن.
// أي طلب من غير admin يُرفض دون كشف وجود الخاصية أصلاً.
function isOwner(): boolean {
  try { return readSessionFromCookies()?.role === "admin"; } catch { return false; }
}

export async function GET() {
  if (!isOwner()) return NextResponse.json({ error: "غير متاح" }, { status: 404 });
  const sql = ledgerDb();
  if (!sql) return NextResponse.json({ balanceUsd: null });
  return NextResponse.json({ balanceUsd: await getBalanceUsd(sql) });
}

const schema = z.object({ balanceUsd: z.number().min(0).max(100000) });

export async function POST(request: Request) {
  if (!isOwner()) return NextResponse.json({ error: "غير متاح" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
  const sql = ledgerDb();
  if (!sql) return NextResponse.json({ error: "قاعدة البيانات غير متاحة" }, { status: 503 });
  await setBalanceUsd(sql, parsed.data.balanceUsd);
  return NextResponse.json({ balanceUsd: parsed.data.balanceUsd });
}
