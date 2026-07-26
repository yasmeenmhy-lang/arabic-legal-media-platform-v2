import { NextResponse } from "next/server";
import { deleteJob, getJob, jobsDb } from "@/lib/content-jobs";
import { readSessionFromCookies } from "@/lib/access-auth";
import { getBalanceUsd, ledgerDb } from "@/lib/cost-ledger";

// عدّاد التكلفة الداخلي — يظهر لمالكة المنصة (دور admin) وحدها، لا لمستخدمي المنصة
async function ownerCostFields(costUsd: number | null | undefined) {
  try {
    if (readSessionFromCookies()?.role !== "admin") return {};
    let balanceUsd: number | undefined;
    const l = ledgerDb();
    if (l) balanceUsd = await getBalanceUsd(l);
    return { costUsd: costUsd ?? undefined, balanceUsd };
  } catch {
    return {};
  }
}

// متابعة مهمة إنشاء خلفية: الواجهة تستطلع حتى تكتمل — وتُقرّ بالاستلام فيُحذف الصف
// (الجدول ممر تسليم مؤقت، لا مخزن محتوى — خصوصية بقرار مالكة المنصة).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const ack = url.searchParams.get("ack") === "1";
  if (!id) return NextResponse.json({ status: "missing" }, { status: 400 });

  const sql = jobsDb();
  if (!sql) return NextResponse.json({ status: "missing" }, { status: 503 });

  if (ack) {
    await deleteJob(sql, id).catch(() => {});
    return NextResponse.json({ status: "acked" });
  }

  const job = await getJob(sql, id);
  if (!job) return NextResponse.json({ status: "missing" });
  if (job.status === "done") {
    // review اختياري: تقرير مراجعة كامل محسوب من حكم الإنشاء نفسه إن توفر — عملاء
    // لا يقرؤون هذا الحقل غير متأثرين إطلاقاً.
    let review: unknown;
    if (job.review_json) {
      try { review = JSON.parse(job.review_json); } catch { review = undefined; }
    }
    // المصادر المعتمدة المجلوبة (أدلة مرئية) — اختيارية، عملاء لا يقرؤونها غير متأثرين
    let sources: { title: string; url: string }[] | undefined;
    if (job.sources_json) {
      try { sources = JSON.parse(job.sources_json); } catch { sources = undefined; }
    }
    // ملخص إنفاذ المادة (١٠) المعقَّم — تحفظه الواجهة مع النسخة في السجل فلا يضيع
    // سياق المصارحة عند فتح النسخة لاحقاً (بقرار المالكة في المراجعة قبل النشر)
    let sourceGovernance: unknown;
    if (job.enforcement_json) {
      try { sourceGovernance = JSON.parse(job.enforcement_json); } catch { sourceGovernance = undefined; }
    }
    // ملف المصادر — المرجع الوحيد: تحفظه الواجهة جزءاً من النسخة (قاعدة المحرك الواحد)
    let sourceDossier: unknown;
    if (job.dossier_json) {
      try { sourceDossier = JSON.parse(job.dossier_json); } catch { sourceDossier = undefined; }
    }
    return NextResponse.json({ status: "done", text: job.result_text ?? "", truncated: job.truncated, review, sources, sourceNote: job.source_note ?? undefined, sourceGovernance, sourceDossier, ...(await ownerCostFields(job.cost_usd)) });
  }
  if (job.status === "error") return NextResponse.json({ status: "error", error: job.error ?? "تعذر إنشاء المحتوى — حاول مرة أخرى.", ...(await ownerCostFields(job.cost_usd)) });
  return NextResponse.json({ status: "pending", partial: job.partial_text ?? undefined });
}
