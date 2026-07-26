import { z } from "zod";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { badRequest } from "@/lib/api";
import { enhanceReviewOutput } from "@/lib/services/ai-enhancement-service";
import { reviewContent } from "@/lib/services/review-service";
import { persistReviewResult } from "@/lib/services/review-persistence-service";
import { completeJob, createJob, failJob, jobsDb } from "@/lib/content-jobs";
import { runWithCostMeter, meterCostUsd, currentMeter } from "@/lib/cost-meter";
import { ledgerDb, deductUsd } from "@/lib/cost-ledger";

// التحليل كمهمة خلفية — بقرار مالكة المنصة: لا يلزم البقاء في الصفحة كي لا يتوقف
// التحليل ولا تضيع نتيجته. نفس منطق مهام الإنشاء الخلفية تماماً (waitUntil + جدول
// content_jobs المشترك)، بحيث لو غادرت المستخدمة الصفحة يكمل الخادم التحليل، وعند
// العودة يُستأنف الاستطلاع تلقائياً وتظهر النتيجة كأن شيئاً لم يحدث.

// مدة تنفيذ صريحة على فيرسل — بدونها تُقتل الدالة بعد المدة الافتراضية القصيرة
// فتموت المهمة الخلفية (waitUntil محكوم بعمر الدالة) ويتوقف التحليل في منتصفه.
export const maxDuration = 300;

const schema = z.object({
  contentId: z.string().min(1).optional(),
  text: z.string().min(5),
  kind: z
    .enum(["post", "advertisement", "article", "script", "campaign", "visual_content", "infographic", "title", "hashtag", "caption", "publishing_plan", "social_export", "statement", "diary"])
    .optional(),
  contentType: z.string().optional(),
  channel: z.string().optional(),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  sourceHint: z.string().optional(),
  // ★ ملف المصادر المرافق للنسخة (قاعدة المحرك الواحد): يصل المدقق فيتحقق من
  // خريطة الادعاء–المصدر الموجودة أولاً — لا بحث موازٍ يعيد بناء المصادر
  sourceDossier: z.custom<import("@/lib/source-dossier").SourceDossier>((v) => !v || (typeof v === "object" && Array.isArray((v as { claims?: unknown }).claims))).optional(),
  reviewStatus: z.enum(["DRAFT", "REVIEW_REQUIRED", "NEEDS_CORRECTION", "READY_FOR_PUBLISHING", "EXPORTED", "SHARED"]).optional()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("يرجى إرسال نص صالح للمراجعة");

  const sql = jobsDb();
  // بلا قاعدة بيانات: لا مهام خلفية ممكنة — الواجهة تسقط لوضع الطلب المباشر تلقائياً
  if (!sql) return NextResponse.json({ jobId: null });

  const { text, kind, contentId } = parsed.data;
  const context = {
    contentType: parsed.data.contentType,
    channel: parsed.data.channel,
    audience: parsed.data.audience,
    purpose: parsed.data.purpose,
    sourceHint: parsed.data.sourceHint,
    sourceDossier: parsed.data.sourceDossier,
    reviewStatus: parsed.data.reviewStatus
  };

  try {
    const jobId = crypto.randomUUID();
    await createJob(sql, jobId);
    const work = (async () => {
      // عدّاد التكلفة الداخلي (لمالكة المنصة وحدها) — قياس صرف لا يمسّ التحليل
      await runWithCostMeter(async () => {
      const settleCost = async (): Promise<number> => {
        const m = currentMeter();
        const costUsd = m ? meterCostUsd(m) : 0;
        try { const l = ledgerDb(); if (l && costUsd > 0) await deductUsd(l, costUsd); } catch { /* دفتر اختياري */ }
        return costUsd;
      };
      try {
        const baseReview = await reviewContent(text, kind, context);
        if (baseReview.analysisMode === "pattern-only" || baseReview.evaluationIncomplete) {
          const costUsd = await settleCost();
          await failJob(sql, jobId, "تعذّر إكمال التحليل بالذكاء الاصطناعي حالياً، ولم تُعرض أي نتائج حفاظاً على دقة الحكم. أعد المحاولة بعد قليل.", costUsd);
          return;
        }
        const review = await enhanceReviewOutput({ text, kind, context, review: baseReview });
        // طبقة حفظ Prisma القديمة اختيارية وغير مقروءة في الواجهة — فشلها (تهيئة
        // sqlite قديمة على قاعدة Postgres) كان يفجّر المهمة بعد اكتمال التحليل
        // كاملاً فيضيع ويظهر خطأ إنجليزي خام. لا يُعطَّل تسليم النتيجة بسببها أبداً.
        if (contentId) await persistReviewResult(contentId, review).catch((err) => console.error("[reviews/start:persist]", err));
        const costUsd = await settleCost();
        await completeJob(sql, jobId, JSON.stringify(review), false, undefined, undefined, undefined, costUsd);
      } catch (error) {
        console.error("[reviews/start:job]", error);
        const message = error instanceof Error ? error.message : "خطأ غير متوقع في معالجة المراجعة";
        const isConfigError = message.includes("ANTHROPIC_API_KEY") || message.includes("غير مهيأ");
        const costUsd = await settleCost().catch(() => 0);
        await failJob(sql, jobId, isConfigError ? "خدمة التحليل غير متاحة حالياً — تواصل مع مسؤول المنصة." : message, costUsd).catch(() => {});
      }
      });
    })();
    try {
      waitUntil(work);
    } catch {
      void work; // خارج Vercel (تشغيل محلي): العملية تبقى حية أصلاً
    }
    return NextResponse.json({ jobId });
  } catch (error) {
    // تعذر تسجيل المهمة (قاعدة البيانات) — نُعلم الواجهة فتسقط لوضع الطلب المباشر
    console.error("[reviews/start:job-init]", error);
    return NextResponse.json({ jobId: null });
  }
}
