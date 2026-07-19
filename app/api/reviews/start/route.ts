import { z } from "zod";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { badRequest } from "@/lib/api";
import { enhanceReviewOutput } from "@/lib/services/ai-enhancement-service";
import { reviewContent } from "@/lib/services/review-service";
import { persistReviewResult } from "@/lib/services/review-persistence-service";
import { completeJob, createJob, failJob, jobsDb } from "@/lib/content-jobs";

// التحليل كمهمة خلفية — بقرار مالكة المنصة: لا يلزم البقاء في الصفحة كي لا يتوقف
// التحليل ولا تضيع نتيجته. نفس منطق مهام الإنشاء الخلفية تماماً (waitUntil + جدول
// content_jobs المشترك)، بحيث لو غادرت المستخدمة الصفحة يكمل الخادم التحليل، وعند
// العودة يُستأنف الاستطلاع تلقائياً وتظهر النتيجة كأن شيئاً لم يحدث.

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
    reviewStatus: parsed.data.reviewStatus
  };

  try {
    const jobId = crypto.randomUUID();
    await createJob(sql, jobId);
    const work = (async () => {
      try {
        const baseReview = await reviewContent(text, kind, context);
        if (baseReview.analysisMode === "pattern-only" || baseReview.evaluationIncomplete) {
          await failJob(sql, jobId, "تعذّر إكمال التحليل بالذكاء الاصطناعي حالياً، ولم تُعرض أي نتائج حفاظاً على دقة الحكم. أعد المحاولة بعد قليل.");
          return;
        }
        const review = await enhanceReviewOutput({ text, kind, context, review: baseReview });
        if (contentId) await persistReviewResult(contentId, review);
        await completeJob(sql, jobId, JSON.stringify(review), false);
      } catch (error) {
        console.error("[reviews/start:job]", error);
        const message = error instanceof Error ? error.message : "خطأ غير متوقع في معالجة المراجعة";
        const isConfigError = message.includes("ANTHROPIC_API_KEY") || message.includes("غير مهيأ");
        await failJob(sql, jobId, isConfigError ? "خدمة التحليل غير متاحة حالياً — تواصل مع مسؤول المنصة." : message).catch(() => {});
      }
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
