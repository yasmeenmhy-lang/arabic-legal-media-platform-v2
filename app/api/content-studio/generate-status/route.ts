import { NextResponse } from "next/server";
import { deleteJob, getJob, jobsDb } from "@/lib/content-jobs";

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
    return NextResponse.json({ status: "done", text: job.result_text ?? "", truncated: job.truncated, review, sources });
  }
  if (job.status === "error") return NextResponse.json({ status: "error", error: job.error ?? "تعذر إنشاء المحتوى — حاول مرة أخرى." });
  return NextResponse.json({ status: "pending", partial: job.partial_text ?? undefined });
}
