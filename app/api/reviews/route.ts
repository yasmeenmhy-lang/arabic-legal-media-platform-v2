import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, ok } from "@/lib/api";
import { enhanceReviewOutput } from "@/lib/services/ai-enhancement-service";
import { reviewContent } from "@/lib/services/review-service";
import { persistReviewResult } from "@/lib/services/review-persistence-service";
import { verdictKey, getCachedVerdict, storeVerdict } from "@/lib/services/review-verdict-cache";

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
  // ★ ملف المصادر المرافق للنسخة (قاعدة المحرك الواحد): يصل المدقق فيتحقق من
  // خريطة الادعاء–المصدر الموجودة أولاً — لا بحث موازٍ يعيد بناء المصادر
  sourceDossier: z.custom<import("@/lib/source-dossier").SourceDossier>((v) => !v || (typeof v === "object" && Array.isArray((v as { claims?: unknown }).claims))).optional(),
  reviewStatus: z.enum(["DRAFT", "REVIEW_REQUIRED", "NEEDS_CORRECTION", "READY_FOR_PUBLISHING", "EXPORTED", "SHARED"]).optional()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("يرجى إرسال نص صالح للمراجعة");

  const context = {
    contentType: parsed.data.contentType,
    channel: parsed.data.channel,
    audience: parsed.data.audience,
    purpose: parsed.data.purpose,
    sourceDossier: parsed.data.sourceDossier,
    reviewStatus: parsed.data.reviewStatus
  };

  try {
    // ذاكرة الأحكام المركزية: النص نفسه بسياقه نفسه يُعاد له حكمه المحفوظ من أي
    // متصفح وأي جهاز — لا حكم جديد لنص لم يتغيّر (قرار مالكة المنصة)
    const cacheKey = verdictKey(parsed.data.text, { kind: parsed.data.kind, ...context });
    const cached = await getCachedVerdict(cacheKey);
    if (cached) {
      if (parsed.data.contentId) await persistReviewResult(parsed.data.contentId, cached).catch((err) => console.error("[reviews:persist]", err));
      return ok(cached);
    }

    const baseReview = await reviewContent(parsed.data.text, parsed.data.kind, context);

    // مبدأ «فشل مغلق»: إن تعذّر تحليل الذكاء (تعطّل/عطل مفتاح) لا تُعرض أي نتائج إطلاقاً —
    // تظهر رسالة تحذيرية فقط. لا نتائج نمطية بديلة تُوهم المستخدم بحكم غير مكتمل.
    if (baseReview.analysisMode === "pattern-only" || baseReview.evaluationIncomplete) {
      return NextResponse.json(
        { error: "تعذّر إكمال التحليل بالذكاء الاصطناعي حالياً، ولم تُعرض أي نتائج حفاظاً على دقة الحكم. أعد المحاولة بعد قليل.", unavailable: true },
        { status: 503 }
      );
    }

    const review = await enhanceReviewOutput({
      text: parsed.data.text,
      kind: parsed.data.kind,
      context,
      review: baseReview
    });

    // طبقة حفظ Prisma القديمة اختيارية — فشلها لا يُسقط نتيجة تحليل مكتملة أبداً
    if (parsed.data.contentId) await persistReviewResult(parsed.data.contentId, review).catch((err) => console.error("[reviews:persist]", err));

    await storeVerdict(cacheKey, review);
    return ok(review);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع في معالجة المراجعة";
    const isConfigError = message.includes("ANTHROPIC_API_KEY") || message.includes("غير مهيأ");
    return NextResponse.json(
      { error: isConfigError ? "خدمة التحليل غير متاحة حالياً — تواصل مع مسؤول المنصة." : message },
      { status: 503 }
    );
  }
}
