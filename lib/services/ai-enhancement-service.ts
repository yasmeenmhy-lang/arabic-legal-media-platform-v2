import type { AIEnhancement, ContentKind, ReviewContext, ReviewResult, SocialPlatformKey } from "@/lib/types";
import { requestAIEnhancementJson } from "@/lib/services/ai-provider-service";
import { AUTHORITIES_RULE } from "@/lib/governance";

type ReviewEnhancementInput = {
  text: string;
  kind?: ContentKind;
  context: ReviewContext;
  review: ReviewResult;
};

function logAIEnhancement(message: string, details: Record<string, unknown> = {}) {
  console.info("[ai-enhancement]", message, details);
}

function cleanText(value: unknown, maxLength = 900) {
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/\b(OpenAI|Claude|Anthropic)\b/gi, "المنصة")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function sanitizeEnhancement(raw: unknown, review: ReviewResult): AIEnhancement | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const findingIds = new Set(review.findings.map((finding) => finding.traceabilityId));
  const rewriteIds = new Set(review.governedRewrites.map((rewrite) => rewrite.id));
  const channelKeys = new Set(review.channelRecommendations.map((channel) => channel.key));

  const findingExplanations = asArray(value.findingExplanations)
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const traceabilityId = cleanText(entry.traceabilityId, 120);
      if (!traceabilityId || !findingIds.has(traceabilityId)) return [];
      return [{
        traceabilityId,
        explanation: cleanText(entry.explanation),
        impact: cleanText(entry.impact),
        recommendedAction: cleanText(entry.recommendedAction)
      }];
    });

  const rewriteSuggestions = asArray(value.rewriteSuggestions)
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const rewriteId = cleanText(entry.rewriteId, 120);
      if (!rewriteId || !rewriteIds.has(rewriteId)) return [];
      return [{
        rewriteId,
        explanation: cleanText(entry.explanation),
        suggestedText: cleanText(entry.suggestedText, 1200)
      }];
    });

  const channelRationales = asArray(value.channelRationales)
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const key = cleanText(entry.key, 80) as SocialPlatformKey | undefined;
      if (!key || !channelKeys.has(key)) return [];
      return [{
        key,
        reason: cleanText(entry.reason),
        expectedBenefit: cleanText(entry.expectedBenefit),
        risks: cleanText(entry.risks)
      }];
    });

  const enhancement: AIEnhancement = {
    assistantSummary: cleanText(value.assistantSummary),
    findingExplanations,
    rewriteSuggestions,
    channelRationales,
    recommendationSummary: cleanText(value.recommendationSummary),
    generatedAt: new Date().toISOString()
  };

  const hasUsefulOutput = Boolean(
    enhancement.assistantSummary ||
    enhancement.recommendationSummary ||
    enhancement.findingExplanations.length ||
    enhancement.rewriteSuggestions.length ||
    enhancement.channelRationales.length
  );
  if (!hasUsefulOutput) {
    logAIEnhancement("sanitize-rejected", {
      reason: "provider output did not contain allowed useful fields",
      findingExplanations: enhancement.findingExplanations.length,
      rewriteSuggestions: enhancement.rewriteSuggestions.length,
      channelRationales: enhancement.channelRationales.length,
      hasAssistantSummary: Boolean(enhancement.assistantSummary),
      hasRecommendationSummary: Boolean(enhancement.recommendationSummary)
    });
  }
  return hasUsefulOutput ? enhancement : null;
}

function buildEnhancementPayload(input: ReviewEnhancementInput) {
  return {
    content: {
      excerpt: input.text.slice(0, 1200),
      kind: input.kind,
      contentType: input.context.contentType,
      channel: input.context.channel,
      audience: input.context.audience,
      purpose: input.context.purpose
    },
    immutableDecision: {
      complianceScore: input.review.complianceScore,
      riskScore: input.review.riskScore,
      riskLevel: input.review.riskLevel,
      publishingReadinessScore: input.review.publishingReadinessScore,
      publicationDecision: input.review.publicationDecision
    },
    findings: input.review.findings.map((finding) => ({
      traceabilityId: finding.traceabilityId,
      title: finding.title,
      evidence: finding.evidence,
      issue: finding.issue,
      legalExplanation: finding.legalExplanation,
      potentialImpact: finding.potentialImpact,
      suggestedSaferWording: finding.suggestedSaferWording,
      sourceDocument: finding.sourceDocument,
      legalReference: finding.legalReference
    })),
    rewrites: input.review.governedRewrites.map((rewrite) => ({
      rewriteId: rewrite.id,
      suggestedText: rewrite.suggestedText,
      basis: rewrite.basis
    })),
    channels: input.review.channelRecommendations.map((channel) => ({
      key: channel.key,
      channel: channel.channel,
      reason: channel.reason,
      expectedBenefit: channel.expectedBenefit,
      risks: channel.risks
    }))
  };
}

const enhancementSystemPrompt = [
  "أنت طبقة تحسين لغوي وتفسيري داخل منصة دعم قرار للمحامين.",
  AUTHORITIES_RULE,
  "لا تغيّر أي نتيجة تقييم ولا تنشئ مخالفة ولا تحذف مخالفة ولا تعدّل المراجع أو الدرجات أو قرار النشر.",
  "حسّن فقط وضوح الشرح والتوصيات والصياغة المساعدة باللغة العربية المهنية.",
  "لا تذكر اسم أي مزود ذكاء اصطناعي أو نموذج أو API.",
  "أعد JSON فقط بالمفاتيح المسموحة: assistantSummary, findingExplanations, rewriteSuggestions, channelRationales, recommendationSummary.",
  "يجب أن تستخدم traceabilityId و rewriteId و channel key كما وردت فقط."
].join("\n");

export async function enhanceReviewOutput(input: ReviewEnhancementInput): Promise<ReviewResult> {
  const raw = await requestAIEnhancementJson({
    system: enhancementSystemPrompt,
    user: JSON.stringify(buildEnhancementPayload(input)),
    maxTokens: 1800
  });
  if (!raw) {
    logAIEnhancement("fallback", { reason: "no provider enhancement payload" });
  }
  const aiEnhancement = sanitizeEnhancement(raw, input.review);
  if (aiEnhancement) {
    logAIEnhancement("enhancement-created", {
      findingExplanations: aiEnhancement.findingExplanations.length,
      rewriteSuggestions: aiEnhancement.rewriteSuggestions.length,
      channelRationales: aiEnhancement.channelRationales.length,
      hasAssistantSummary: Boolean(aiEnhancement.assistantSummary)
    });
  }
  return aiEnhancement ? { ...input.review, aiEnhancement } : input.review;
}

export function diagnoseEnhancementSanitization(rawPayload: unknown) {
  if (!rawPayload) {
    return {
      attempted: false,
      accepted: false,
      reason: "no parsed provider payload"
    };
  }

  const diagnosticReview = {
    findings: [{ traceabilityId: "diagnostic-finding" }],
    governedRewrites: [{ id: "diagnostic-rewrite" }],
    channelRecommendations: [{ key: "linkedin" }]
  } as ReviewResult;
  const sanitized = sanitizeEnhancement(rawPayload, diagnosticReview);
  return {
    attempted: true,
    accepted: Boolean(sanitized),
    reason: sanitized ? null : "sanitizeEnhancement rejected provider payload",
    counts: sanitized
      ? {
          findingExplanations: sanitized.findingExplanations.length,
          rewriteSuggestions: sanitized.rewriteSuggestions.length,
          channelRationales: sanitized.channelRationales.length,
          hasAssistantSummary: Boolean(sanitized.assistantSummary),
          hasRecommendationSummary: Boolean(sanitized.recommendationSummary)
        }
      : {
          findingExplanations: 0,
          rewriteSuggestions: 0,
          channelRationales: 0,
          hasAssistantSummary: false,
          hasRecommendationSummary: false
        }
  };
}
