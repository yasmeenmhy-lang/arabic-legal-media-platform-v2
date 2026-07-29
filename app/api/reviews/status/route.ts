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

// متابعة مهمة تحليل خلفية — الواجهة تستطلع حتى تكتمل، وتُقرّ بالاستلام فيُحذف الصف
// (الجدول ممر تسليم مؤقت، لا مخزن نتائج — خصوصية بقرار مالكة المنصة).
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
    try {
      return NextResponse.json({ status: "done", data: JSON.parse(job.result_text ?? "null"), ...(await ownerCostFields(job.cost_usd)) });
    } catch {
      return NextResponse.json({ status: "error", error: "تعذّر قراءة نتيجة التحليل — أعد المحاولة." });
    }
  }
  if (job.status === "error") return NextResponse.json({ status: "error", error: job.error ?? "تعذر إكمال المراجعة.", ...(await ownerCostFields(job.cost_usd)) });
  // المرحلة الجارية فعلاً — تقرأها الواجهة فيتقدّم العدّاد بانتقالٍ واقع لا بالزمن
  return NextResponse.json({ status: "pending", stage: job.stage ?? undefined });
}
