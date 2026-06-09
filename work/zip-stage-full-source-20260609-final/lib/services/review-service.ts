import type { ReviewFinding, ReviewResult, RiskLevel } from "@/lib/types";

const riskyPatterns = [
  { pattern: "نضمن", issue: "وعد بنتيجة", advice: "استبدلها بصياغة احتمالية لا تضمن النتيجة." },
  { pattern: "أفضل محام", issue: "ادعاء تفضيلي غير موثق", advice: "استخدم وصفا مهنيا قابلا للتحقق." },
  { pattern: "اكسب قضيتك", issue: "إيحاء بضمان كسب القضية", advice: "وضح أن النتائج تعتمد على الوقائع والأنظمة." },
  { pattern: "سر مضمون", issue: "تسويق مضلل", advice: "قدم معلومة عامة دون صياغة سرية أو مبالغ فيها." }
];

export function reviewContent(text: string): ReviewResult {
  const findings: ReviewFinding[] = riskyPatterns
    .filter((item) => text.includes(item.pattern))
    .map((item) => ({
      issue: item.issue,
      severity: "HIGH" as RiskLevel,
      evidence: item.pattern,
      advice: item.advice
    }));

  const complianceScore = Math.max(35, 96 - findings.length * 22);
  const riskLevel: RiskLevel = findings.length >= 3 ? "CRITICAL" : findings.length >= 1 ? "HIGH" : "LOW";

  return {
    complianceScore,
    riskLevel,
    summary:
      findings.length > 0
        ? "توجد عبارات تحتاج مراجعة امتثالية قبل النشر."
        : "لا توجد مؤشرات عالية المخاطر في النص التجريبي.",
    findings
  };
}
