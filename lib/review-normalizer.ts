import type { ReviewResult, RiskAffectedParty, RiskLevel } from "@/lib/types";
import {
  buildConfidence,
  buildPublicationDecision,
  buildReadinessDecision
} from "@/lib/services/decision-support-service";
import { calculateContentQualityScore } from "@/lib/services/scoring-service";
import { countAdvisoryLanguageIssues, languageGateReason } from "@/lib/language-gate";

// تطبيع التحليلات المحفوظة وقت العرض: القواعد الحالية تُطبَّق على كل نسخة
// محفوظة أو مشاركة — قديمة أو جديدة — بدل عرض قرارات محسوبة بقواعد قديمة.
// طبقة القرار (المخاطر المُرضَّاة، الثقة، الجاهزية، قرار النشر، الجودة)
// تُعاد اشتقاقها من المعطيات الخام المخزّنة عبر نفس دوال الخادم الحتمية.

const RISK_ORDER: RiskLevel[] = ["منخفض", "متوسط", "مرتفع", "بالغ"];

function partiesToRiskLevel(count: number): RiskLevel {
  if (count >= 3) return "مرتفع";
  if (count === 2) return "متوسط";
  return "منخفض";
}

function riskLevelToScore(level: RiskLevel): number {
  if (level === "بالغ") return 100;
  if (level === "مرتفع") return 70;
  if (level === "متوسط") return 40;
  return 10;
}

export function normalizeReviewResult(review: ReviewResult): ReviewResult {
  try {
    if (!review || !Array.isArray(review.findings) || !review.publicationDecision) return review;

    const unresolved = review.findings.filter((f) => !f.resolved);

    // ١) أرضية المخاطر — نفس قاعدة الخادم: وجود مخالفات يعني تأثر المحامي
    // والمهنة على الأقل، فلا يبقى المستوى «منخفض» مع مخالفات قائمة.
    const storedParties = (review.riskScoreExplanation?.affectedParties ?? []) as RiskAffectedParty[];
    const parties = unresolved.length > 0
      ? ([...new Set([...storedParties, "المحامي", "المهنة"])] as RiskAffectedParty[])
      : storedParties;
    const floor = partiesToRiskLevel(parties.length);
    const useFloor =
      unresolved.length > 0 && RISK_ORDER.indexOf(floor) > RISK_ORDER.indexOf(review.riskLevel);
    const riskLevel = useFloor ? floor : review.riskLevel;
    const riskScore = riskLevelToScore(riskLevel);
    const riskScoreExplanation = useFloor
      ? {
          ...review.riskScoreExplanation,
          level: riskLevel,
          affectedParties: parties,
          explanation: [
            `رُصدت ${unresolved.length} مخالفة امتثال — عدم الالتزام بقواعد السلوك المهني يعرّض المحامي للمساءلة ويضر بسمعة المهنة.`,
            review.riskScoreExplanation?.explanation &&
            !review.riskScoreExplanation.explanation.startsWith("تعذّر")
              ? review.riskScoreExplanation.explanation
              : ""
          ]
            .filter(Boolean)
            .join(" ")
        }
      : review.riskScoreExplanation;

    // ٢) جودة المحتوى تُعاد من نفس دالة الخادم بالمخاطر المُرضَّاة —
    // فلا يظهر «السلامة من المخاطر: ممتاز» مع مخالفات قائمة.
    const languageScore = review.languageQuality?.score ?? 0;
    const contentQualityScoreExplanation = calculateContentQualityScore({
      complianceScore: review.complianceScore,
      riskScore,
      professionalismScore: review.professionalismScore ?? 0,
      languageScore
    });

    // ٣) بوابات جاهزية النشر تُعاد بناؤها كاملةً من الدرجات المخزّنة بقواعد اليوم —
    // النصوص المخزّنة قد تكون بعتبات قديمة فتناقض البطاقات (سليم لغوياً مقابل ✗ أخطاء لغوية)
    const storedReadiness = review.publishingReadinessExplanation;
    let publishingReadinessExplanation = storedReadiness;
    if (storedReadiness?.gates) {
      const languagePassed = review.languageQuality?.passed ?? languageScore >= 75;
      const professionalismScore = review.professionalismScore ?? 0;
      const gates = storedReadiness.gates.map((gate) => {
        if (gate.key === "compliance") {
          const passed = review.complianceScore === 100;
          return {
            ...gate,
            passed,
            sourceValue: review.complianceScore,
            reason: passed
              ? "لا توجد مخالفات قانونية — النص ملتزم بالكامل."
              : "يوجد مخالفات قانونية يجب إصلاحها قبل النشر."
          };
        }
        if (gate.key === "risk") {
          return {
            ...gate,
            passed: riskScore < 20,
            sourceValue: riskScore,
            reason: riskScore < 20
              ? "مستوى المخاطر منخفض جداً ومناسب للنشر."
              : "المحتوى يحتوي على مخاطر عالية."
          };
        }
        if (gate.key === "professionalism") {
          const passed = professionalismScore >= 80;
          return {
            ...gate,
            passed,
            sourceValue: professionalismScore,
            reason: passed ? "الأسلوب مستوفٍ للمعايير المهنية المعتمدة." : "الأسلوب غير مستوفٍ للمعايير المهنية المعتمدة."
          };
        }
        if (gate.key === "language") {
          return {
            ...gate,
            passed: languagePassed,
            sourceValue: languageScore,
            reason: languagePassed
              ? languageGateReason(countAdvisoryLanguageIssues(review.languageQuality?.issues ?? []))
              : "يوجد أخطاء لغوية يجب تصحيحها."
          };
        }
        return gate;
      });
      const allPassed = gates.every((gate) => gate.passed);
      publishingReadinessExplanation = {
        ...storedReadiness,
        gates,
        allPassed,
        finalScore: allPassed ? 100 : 0
      };
    }

    // ٤) طبقة القرار كاملة تُعاد وفق القواعد الحالية: الثقة، الجاهزية، قرار النشر
    const confidence = buildConfidence(review.findings);
    const approved = ["READY_FOR_PUBLISHING", "EXPORTED", "SHARED"].includes(review.reviewStatus);
    const readinessDecision = buildReadinessDecision({
      complianceScore: review.complianceScore,
      riskScore,
      professionalismScore: review.professionalismScore ?? 0,
      riskLevel,
      languagePassed: review.languageQuality?.passed ?? true,
      approved,
      findings: review.findings
    });
    const publicationDecision = buildPublicationDecision({
      confidence,
      readiness: readinessDecision,
      findings: review.findings,
      riskLevel,
      languageIssuesCount: review.languageQuality?.issues?.length ?? 0
    });

    return {
      ...review,
      riskLevel,
      riskScoreExplanation,
      contentQualityScore: contentQualityScoreExplanation.finalScore,
      contentQualityScoreExplanation,
      publishingReadinessScore: publishingReadinessExplanation?.finalScore ?? review.publishingReadinessScore,
      publishingReadinessExplanation,
      confidence,
      readinessDecision,
      publicationDecision
    };
  } catch {
    // سجل قديم ناقص الحقول: يُعرض كما هو بدل كسر الصفحة
    return review;
  }
}
