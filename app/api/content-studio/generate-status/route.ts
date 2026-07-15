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
  if (job.status === "done") return NextResponse.json({ status: "done", text: job.result_text ?? "", truncated: job.truncated });
  if (job.status === "error") return NextResponse.json({ status: "error", error: job.error ?? "فشل غير معروف" });
  return NextResponse.json({ status: "pending", partial: job.partial_text ?? undefined });
}
