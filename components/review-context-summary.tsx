"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { DgaBlockquote, Panel, StatusBadge } from "@/components/ui";
import { riskDisplayLabel } from "@/lib/types";
import type { ReviewFinding, ReviewResult, RiskLevel } from "@/lib/types";
import { scopedKey } from "@/lib/user-scope";

export type StoredReviewContext = {
  reviewId: string;
  shortExcerpt: string;
  contentType?: string;
  channel?: string;
  audience?: string;
  purpose?: string;
  riskLevel?: string;
  isCompliant?: boolean;
  readinessLevel?: string;
  reviewedAt?: string;
};

// معزولان لكل حساب — لا يتسرب سياق مراجعة حساب لحساب آخر على نفس الجهاز
const STORAGE_KEY = "lawyer-media:last-review-context";
const SNAPSHOT_KEY = "lawyer-media:last-review-snapshot";

type StoredOpportunity = {
  id: string;
  category: string;
  severity: string;
  excerpt: string;
  suggestion: string;
};

export type StoredReviewSnapshot = {
  context: StoredReviewContext;
  summary: string;
  findings: Pick<
    ReviewFinding,
    | "traceabilityId"
    | "title"
    | "category"
    | "domain"
    | "potentialImpact"
    | "weight"
    | "scoreImpact"
    | "issue"
    | "severity"
    | "evidence"
    | "legalReference"
    | "articleTitle"
    | "articleTextExcerpt"
    | "legalExplanation"
    | "suggestedSaferWording"
    | "sourceDocument"
    | "sourceUrl"
    | "confidenceLevel"
  >[];
  opportunities: StoredOpportunity[];
  risk: {
    level: string;
    reason: string;
    readinessLevel: string;
  };
  references: ReviewResult["referencesPanel"];
};

export function saveLatestReviewContext(context: StoredReviewContext) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(context));
  } catch {
    /* بيئة بلا تخزين أو حصة ممتلئة — اللقطة إثراء اختياري */
  }
}

export function saveLatestReviewSnapshot(review: ReviewResult) {
  if (typeof window === "undefined") return;
  const context: StoredReviewContext = {
    ...review.reviewContext,
    riskLevel: review.riskLevel,
    // الامتثال وجاهزية النشر أحكام مباشرة لا نسب مئوية — بقرار مالكة المنصة
    isCompliant: review.findings.length === 0,
    readinessLevel: review.readinessDecision.level
  };
  const snapshot: StoredReviewSnapshot = {
    context,
    summary: review.summary,
    findings: review.findings.map((finding) => ({
      traceabilityId: finding.traceabilityId,
      title: finding.title,
      category: finding.category,
      domain: finding.domain,
      potentialImpact: finding.potentialImpact,
      weight: finding.weight,
      scoreImpact: finding.scoreImpact,
      issue: finding.issue,
      severity: finding.severity,
      evidence: finding.evidence,
      legalReference: finding.legalReference,
      articleTitle: finding.articleTitle,
      articleTextExcerpt: finding.articleTextExcerpt,
      legalExplanation: finding.legalExplanation,
      suggestedSaferWording: finding.suggestedSaferWording,
      sourceDocument: finding.sourceDocument,
      sourceUrl: finding.sourceUrl,
      confidenceLevel: finding.confidenceLevel
    })),
    opportunities: review.languageQuality.issues.map((issue) => ({
      id: issue.id,
      category: issue.category,
      severity: issue.severity,
      excerpt: issue.excerpt,
      suggestion: issue.suggestion
    })),
    risk: {
      level: review.riskLevel,
      reason: review.legalRiskAssessment.reason,
      readinessLevel: review.readinessDecision.level
    },
    references: review.referencesPanel
  };
  // فشل تخزين المتصفح (امتلاء الحصة/وضع خاص) لا يجوز أن يُفجّر مساراً يعرض نتيجة
  // جاهزة — اللقطة إثراء اختياري، وضياعها أهون من تجميد شاشة النتائج على «يعمل...»
  try {
    window.sessionStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(context));
    window.sessionStorage.setItem(scopedKey(SNAPSHOT_KEY), JSON.stringify(snapshot));
  } catch {
    /* بيئة بلا تخزين أو حصة ممتلئة — نتجاوز بصمت */
  }
}

function useLatestReviewSnapshot() {
  const [snapshot, setSnapshot] = useState<StoredReviewSnapshot | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(scopedKey(SNAPSHOT_KEY));
    if (!raw) return;
    try {
      setSnapshot(JSON.parse(raw) as StoredReviewSnapshot);
    } catch {
      setSnapshot(null);
    }
  }, []);

  return snapshot;
}

function EmptyScopedState({ label }: { label: string }) {
  return (
    <Panel>
      <p className="text-sm leading-7 text-ink/65">لا توجد {label} مرتبطة بمراجعة نشطة في هذه الجلسة. ابدأ من صفحة مراجعة المحتوى لعرض النتائج الخاصة بكل شاشة.</p>
    </Panel>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line/70 pb-3 last:border-b-0 last:pb-0">
      <p className="mb-1 text-xs font-normal leading-6 text-ink/55">{label}</p>
      <div className="text-sm leading-8 text-ink">{children}</div>
    </div>
  );
}

export function ReviewContextSummary({ focus }: { focus: "findings" | "opportunities" | "risk" | "references" | "results" }) {
  const [context, setContext] = useState<StoredReviewContext | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return;
    try {
      setContext(JSON.parse(raw) as StoredReviewContext);
    } catch {
      setContext(null);
    }
  }, []);

  const focusLabels: Record<typeof focus, string> = {
    findings: "ملاحظات الامتثال",
    opportunities: "فرص التحسين",
    risk: "مؤشرات المخاطر",
    references: "المراجع الرسمية",
    results: "نتائج المراجعة"
  };

  if (!context) {
    return (
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-normal leading-6 text-palm">سياق المراجعة</p>
            <p className="mt-1 text-sm leading-7 text-ink/65">لا توجد مراجعة نشطة في هذه الجلسة. ابدأ من صفحة مراجعة المحتوى لعرض السياق المختصر هنا.</p>
          </div>
          <Link href="/content-review" className="rounded-md border border-line bg-white px-4 py-2.5 text-sm font-normal text-palm focus-ring">
            فتح مراجعة المحتوى
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-normal leading-6 text-palm">سياق {focusLabels[focus]}</p>
          <p className="mt-1 text-sm leading-7 text-ink/70">{context.shortExcerpt}</p>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5 xl:min-w-[720px]">
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">نوع المحتوى</span><strong className="mt-1 block font-normal text-ink">{context.contentType ?? "غير محدد"}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">القناة</span><strong className="mt-1 block font-normal text-ink">{context.channel ?? "غير محدد"}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">مستوى المخاطر</span><strong className="mt-1 block font-normal text-ink">{context.riskLevel ? riskDisplayLabel(context.riskLevel as RiskLevel) : "غير متاح"}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">الامتثال</span><strong className="mt-1 block font-normal text-ink">{typeof context.isCompliant === "boolean" ? (context.isCompliant ? "ملتزم" : "غير ملتزم") : "غير متاح"}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">جاهزية النشر</span><strong className="mt-1 block font-normal text-ink">{context.readinessLevel ?? "غير متاح"}</strong></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <StatusBadge tone={["بالغ", "حرج", "مرتفع"].includes(context.riskLevel ?? "") ? "gold" : context.riskLevel === "متوسط" ? "neutral" : "good"}>{focusLabels[focus]}</StatusBadge>
        <Link href="/content-review?open=1#decision" className="rounded-md border border-line bg-paper px-3 py-2 text-ink/70 transition hover:border-palm hover:text-palm focus-ring">
          العودة إلى المراجعة
        </Link>
        <Link href="/legal-compliance" className="rounded-md border border-line bg-paper px-3 py-2 text-ink/70 transition hover:border-palm hover:text-palm focus-ring">
          الملاحظات
        </Link>
        <Link href="/recommendations" className="rounded-md border border-line bg-paper px-3 py-2 text-ink/70 transition hover:border-palm hover:text-palm focus-ring">
          فرص التحسين
        </Link>
        <Link href="/risk-assessment" className="rounded-md border border-line bg-paper px-3 py-2 text-ink/70 transition hover:border-palm hover:text-palm focus-ring">
          المخاطر
        </Link>
        <Link href="/library" className="rounded-md border border-line bg-paper px-3 py-2 text-ink/70 transition hover:border-palm hover:text-palm focus-ring">
          المراجع
        </Link>
      </div>
    </Panel>
  );
}

export function ReviewFindingsSection() {
  const snapshot = useLatestReviewSnapshot();
  if (!snapshot) return <EmptyScopedState label="ملاحظات امتثال" />;

  return (
    <Panel>
      <div className="mb-4">
        <p className="text-base font-normal text-ink">ملاحظات الامتثال المرتبطة بالمراجعة</p>
        <p className="mt-1 text-xs leading-6 text-ink/55">تعرض هذه الشاشة الملاحظات المرصودة فقط، دون تكرار النص الكامل محل المراجعة.</p>
      </div>
      <div className="space-y-5">
        {snapshot.findings.length > 0 ? snapshot.findings.map((finding, index) => (
          <article key={`${finding.legalReference}-${index}`} className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-normal leading-8 text-ink">{finding.title}</p>
                <p className="mt-1 text-sm leading-7 text-ink/55">{finding.legalReference} - {finding.articleTitle}</p>
              </div>
              <StatusBadge tone={finding.severity === "مرتفع" ? "gold" : finding.severity === "متوسط" ? "neutral" : "good"}>{finding.severity}</StatusBadge>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <FieldBlock label="الفئة والمجال">{finding.category} - {finding.domain}</FieldBlock>
              <FieldBlock label="الشدة والأثر المحتمل">{finding.severity} - {finding.potentialImpact}</FieldBlock>
              <DgaBlockquote title="العبارة محل المراجعة" text={finding.evidence} transparent />
              <FieldBlock label="المصدر الرسمي">
                <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-normal text-palm underline underline-offset-4">{finding.sourceDocument}<ExternalLink size={14} aria-hidden="true" /></a>
              </FieldBlock>
              <DgaBlockquote title="مقتطف المرجع النظامي" text={finding.articleTextExcerpt} transparent />
              <DgaBlockquote title="الشرح القانوني" text={finding.legalExplanation} transparent />
              <DgaBlockquote title="التوصية" text={finding.suggestedSaferWording} transparent />
              <FieldBlock label="مستوى الثقة">{finding.confidenceLevel}</FieldBlock>
            </div>
          </article>
        )) : (
          <p className="rounded-lg border border-line bg-paper p-4 text-sm leading-8 text-ink/70">لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.</p>
        )}
      </div>
    </Panel>
  );
}

export function ReviewOpportunitiesSection() {
  const snapshot = useLatestReviewSnapshot();
  if (!snapshot) return <EmptyScopedState label="فرص تحسين" />;

  return (
    <Panel>
      <div className="mb-4">
        <p className="text-base font-normal text-ink">فرص التحسين الصياغي</p>
        <p className="mt-1 text-xs leading-6 text-ink/55">تعرض هذه الشاشة فرص التحسين فقط، ولا تعرض النص الكامل محل المراجعة.</p>
      </div>
      <div className="space-y-4">
        {snapshot.opportunities.length > 0 ? snapshot.opportunities.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-normal leading-7 text-ink">{item.category}</p>
              <StatusBadge tone={item.severity === "high" || item.severity === "critical" ? "gold" : "neutral"}>{item.severity}</StatusBadge>
            </div>
            <div className="space-y-4">
              <DgaBlockquote title="الموضع" text={item.excerpt || "-"} transparent />
              <DgaBlockquote title="اتجاه التحسين" text={item.suggestion} transparent />
            </div>
          </article>
        )) : (
          <p className="rounded-lg border border-line bg-paper p-4 text-sm leading-8 text-ink/70">لا توجد فرص تحسين صياغي مؤثرة في هذه المراجعة.</p>
        )}
      </div>
    </Panel>
  );
}

export function ReviewRiskSection() {
  const snapshot = useLatestReviewSnapshot();
  if (!snapshot) return <EmptyScopedState label="مؤشرات مخاطر" />;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-normal text-ink">مؤشرات المخاطر لهذه المراجعة</p>
          <p className="mt-1 text-xs leading-6 text-ink/55">تعرض هذه الشاشة مستوى المخاطر وسبب التصنيف فقط.</p>
        </div>
        <StatusBadge tone={["بالغ", "حرج", "مرتفع"].includes(snapshot.risk.level) ? "gold" : snapshot.risk.level === "متوسط" ? "neutral" : "good"}>{riskDisplayLabel(snapshot.risk.level as RiskLevel)}</StatusBadge>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FieldBlock label="مستوى المخاطر">{riskDisplayLabel(snapshot.risk.level as RiskLevel)}</FieldBlock>
        <FieldBlock label="جاهزية النشر">{snapshot.risk.readinessLevel}</FieldBlock>
        <FieldBlock label="عدد الملاحظات">{snapshot.findings.length}</FieldBlock>
      </div>
      <div className="mt-4">
        <DgaBlockquote title="سبب التصنيف" text={snapshot.risk.reason} transparent />
      </div>
    </Panel>
  );
}

export function ReviewReferencesSection() {
  const snapshot = useLatestReviewSnapshot();
  if (!snapshot) return <EmptyScopedState label="مراجع رسمية" />;

  return (
    <Panel>
      <div className="mb-4">
        <p className="text-base font-normal text-ink">المراجع الرسمية المرتبطة بالمراجعة</p>
        <p className="mt-1 text-xs leading-6 text-ink/55">تعرض هذه الشاشة المراجع التي استندت إليها الملاحظات فقط.</p>
      </div>
      <div className="space-y-4">
        {snapshot.references.length > 0 ? snapshot.references.map((reference) => {
          const finding = snapshot.findings.find((item) => item.sourceDocument === reference.sourceDocument && item.legalReference === reference.legalReference);
          return (
            <article key={`${reference.sourceDocument}-${reference.legalReference}`} className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <FieldBlock label="اسم المرجع">{reference.sourceDocument}</FieldBlock>
                <FieldBlock label="اسم القاعدة أو اللائحة">{reference.sourceDocument}</FieldBlock>
                <FieldBlock label="رقم المادة أو القاعدة">{reference.legalReference}</FieldBlock>
                <DgaBlockquote title="النص أو المضمون المرتبط بالمحتوى" text={reference.articleTextExcerpt} transparent />
                <DgaBlockquote title="العبارة المرتبطة من المحتوى" text={finding?.evidence ?? snapshot.context.shortExcerpt} transparent />
                <DgaBlockquote title="سبب الاستناد إلى المرجع" text={finding?.legalExplanation ?? "ارتباط التحليل بالنص الرسمي ذي الصلة."} transparent />
                <DgaBlockquote title="أثره على المحتوى" text={finding ? `${finding.issue} — ${finding.potentialImpact}` : "توثيق نتيجة التحليل."} transparent />
                <DgaBlockquote title="التوجيه التطبيقي" text={finding?.suggestedSaferWording ?? "مراجعة الصياغة وفق المرجع الرسمي قبل النشر."} transparent />
                <FieldBlock label="الرابط الرسمي المباشر">
                  <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 font-normal text-white focus-ring">الوصول المباشر إلى المرجع الرسمي<ExternalLink size={14} aria-hidden="true" /></a>
                </FieldBlock>
              </div>
            </article>
          );
        }) : (
          <p className="rounded-lg border border-line bg-paper p-4 text-sm leading-8 text-ink/70">لا توجد مراجع مرتبطة بملاحظات مرصودة في هذه المراجعة.</p>
        )}
      </div>
    </Panel>
  );
}
