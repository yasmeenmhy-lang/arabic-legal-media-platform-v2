// ─────────────────────────────────────────────────────────────────────────────
// حاكم المنصة — بوابة واحدة يستدعيها كل مسار يقترح أو ينشئ نصاً، بلا استثناء.
// المرجع الحاكم: قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة،
// المقنَّنة في legal-knowledge-base (أرقام المواد، نصوصها، مصادرها الرسمية).
//
// طبقتان تقيسان على نفس المواد الثابتة:
//   ١) حصن حتمي (scanProhibited): مطابقة حرفية عالية الدقة للعبارات المحظورة الصريحة
//      — فوري وبلا استدعاء ذكاء، يُطبَّق على كل نص في المنصة بلا استثناء.
//   ٢) عمق دلالي (governText): نفس محرك المراجعة (runSemanticAnalysis) يقرأ المعنى
//      فيمسك المخالفة ولو أُعيدت صياغتها — للمسارات التي تُنشئ نصاً قانونياً منشوراً.
// ─────────────────────────────────────────────────────────────────────────────
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import type { ContentKind, ReviewContext } from "@/lib/types";

export type ProhibitedHit = { pattern: string; legalReference: string; articleTitle: string };

// تطبيع عربي بسيط: إزالة التشكيل وتوحيد الهمزات والألف المقصورة والتاء المربوطة،
// حتى لا تفلت العبارة المحظورة باختلاف شكلي طفيف.
function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

// العبارات المحظورة الصريحة — متعددة الكلمات فقط لضمان دقة عالية وتفادي الإيجابيات
// الكاذبة على ألفاظ مفردة مشتركة (مثل «يضمن» في «يضمن النظام هذا الحق»). الألفاظ
// المفردة الملتبسة يتركها الحصن الحتمي للعمق الدلالي الذي يحكم بالمعنى لا بالكلمة.
const PRECISE_PROHIBITIONS: ProhibitedHit[] = legalKnowledgeEntries.flatMap((entry) =>
  (entry.prohibitedPatterns ?? [])
    .filter((p) => p.trim().includes(" "))
    .map((pattern) => ({
      pattern,
      legalReference: entry.legalReference || "قواعد السلوك المهني للمحامين",
      articleTitle: entry.articleTitle || entry.section || "",
    }))
);

// الحصن الحتمي: يرجع كل عبارة محظورة صريحة وُجدت في النص، منسوبة لمادتها.
export function scanProhibited(text: string): ProhibitedHit[] {
  const norm = normalizeArabic(text);
  const seen = new Set<string>();
  const hits: ProhibitedHit[] = [];
  for (const item of PRECISE_PROHIBITIONS) {
    if (seen.has(item.pattern)) continue;
    if (norm.includes(normalizeArabic(item.pattern))) {
      hits.push(item);
      seen.add(item.pattern);
    }
  }
  return hits;
}

export function prohibitionsToCorrections(hits: ProhibitedHit[]): string[] {
  return hits.map(
    (h) =>
      `- عبارة محظورة صريحة تخالف ${h.legalReference}${h.articleTitle ? ` (${h.articleTitle})` : ""}: «${h.pattern}» — احذفها تماماً وأعد الصياغة بما يوافق القاعدة.`
  );
}

// الحاكم الكامل: الحصن الحتمي + العمق الدلالي (نفس محرك المراجعة)، مدموجين.
// يرجع النص نظيفاً أو قائمة تصحيحات إلزامية منسوبة لموادها لإعادة الكتابة.
export async function governText(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind
): Promise<{ clean: boolean; corrections: string[] }> {
  const prohibitions = scanProhibited(text);
  const gov = await runSemanticAnalysis(text, context, contentKind);
  const semantic = gov.findings.map((v) => {
    const ref = v.legalReference || "قواعد السلوك المهني للمحامين";
    const title = v.articleTitle ? ` (${v.articleTitle})` : "";
    const safer = v.suggestedSaferWording ? ` — الصياغة الأسلم: ${v.suggestedSaferWording}` : "";
    return `- مخالفة لـ${ref}${title}: ${v.issue}${safer}`;
  });
  const corrections = [...prohibitionsToCorrections(prohibitions), ...semantic];
  return { clean: corrections.length === 0, corrections };
}
