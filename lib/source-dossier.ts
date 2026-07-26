// ─────────────────────────────────────────────────────────────────────────────
// ملف المصادر وخريطة الادعاء–المصدر — المرجع الوحيد للمصادر في المنصة.
//
// ★ قاعدة المحرك الواحد (بقرار مالكة المنصة — ملزمة لكل تطوير):
// «المحتوى هو الأصل، والمصادر جزء من هوية المحتوى لا مخرجات مؤقتة».
// Source Dossier هو المرجع الوحيد للمصادر طوال دورة حياة المحتوى، و
// Claim–Source Mapping هو المرجع الوحيد لربط الادعاءات بالمصادر — ولا يجوز
// لأي مسار (إنشاء، مراجعة، تحسين, إعادة صياغة، تحليل، تصدير، أو تطوير
// مستقبلي) أن يبني أو يحفظ أو يعرض أو يفسر المصادر بطريقة مختلفة.
//
// ★ مبدأ الإثبات: المحتوى لا يُبنى على المصادر — يُبنى على الحقائق المثبتة
// بالمصادر: فكرة ← فهم ← ادعاءات ← إثبات ← محتوى. المصدر لا يدخل إلا مثبتاً
// ادعاءً محدداً، ولا ادعاء في المحتوى بلا مصدر متتبع، والمتعذر إثباته يُعامل
// بأحكام المادة (١٠) لا يُعرض حقيقةً.
// ─────────────────────────────────────────────────────────────────────────────

// ادعاء مستخرج من فهم الطلب — وحدة الإثبات الأساسية
export type DossierClaim = {
  id: string;                 // معرف ثابت (c1, c2...)
  text: string;               // نص الادعاء
  status: "مثبت" | "غير قابل للجزم" | "محكوم بالمادة ١٠" | "عام مشروع";
  sourceId?: string;          // المصدر الذي يثبته
  supportingExcerpt?: string; // المقطع الداعم حرفياً من المصدر
};

// مصدر في الملف — لا يوجد إلا مربوطاً بادعاء
export type DossierSource = {
  id: string;                 // معرف ثابت (s1, s2...)
  title: string;
  url: string;
  issuer?: string;            // الجهة المصدرة
  docType?: string;           // نظام | لائحة | قرار | خبر رسمي | دليل...
  verificationStatus: "مسند بالتقرير" | "متحقق بالفتح" | "مؤكد بالمراجعة" | "غير مطابق" | "غير متحقق";
  usedInContent: boolean;     // هل استُخدم فعلياً في النص المسلَّم
  linkedClaimIds: string[];   // الادعاءات المستندة إليه
};

export type SourceDossier = {
  claims: DossierClaim[];
  sources: DossierSource[];
  intentSummary?: string;     // خلاصة التمثيل الدلالي
  article10?: { applied: boolean; stopped: boolean; notice?: string; failedStage?: string };
  researchedAt?: string;
  refreshedAt?: string;       // آخر تحديث بطلب صريح من المستخدم
  // أثر قرار البحث (جولاته وأسباب الانتقال بينها ونتائجها) — يسافر مع النسخة
  researchTrace?: ResearchTraceEntry[];
};

// ── التمثيل الدلالي — مخرج محرك الفهم (المرجع الأول، لا يُتجاوز) ──
export type IntentClaim = {
  id: string;
  text: string;
  needsProof: boolean;        // يحتاج إثباتاً بمصدر (بفئات المادة ١٠)
  whyNeedsProof?: string;
  scope: "المملكة" | "دولي" | "عام";
};

export type IntentRepresentation = {
  mainTopic: string;
  subTopics: string[];
  jurisdiction: "المملكة" | "دولي" | "مختلط";
  infoType: string;           // نظام | لائحة | قرار | خبر رسمي | إجراء | اختصاص | إحصاء | تحليل
  recency: "حديث" | "مستقر";
  candidateAuthorities: string[];   // فرضيات بالاستدلال — تُختبر ولا تُفترض
  candidateOfficialTerms: string[]; // فرضيات المصطلح الرسمي — تُختبر ولا تُفترض
  claims: IntentClaim[];
};

// ما وجده الباحث لادعاء بعينه — يُبنى منه الملف بالكود
export type ClaimFinding = {
  claimId: string;
  status: "مثبت" | "لم يُعثر";
  url?: string;
  title?: string;
  issuer?: string;
  docType?: string;
  excerpt?: string;
  // سبب عدم العثور بلفظ الباحث (أو سبب الخفض الحتمي كرابط مختلَق) — يُبنى منه
  // مبرر جولة التوسيع ويُسجل في أثر البحث (مبدأ: كل انتقال مبرر ومسجل)
  reason?: string;
};

// ── أثر قرار البحث — بقرار مالكة المنصة في اعتماد الدفعة (ب): ─────────────────
// «تُسجل أسباب كل انتقال من محاولة إلى أخرى حتى يمكن تتبع قرار البحث لاحقاً».
// كل جولة (بحث أول، توسيع، تثبيت بالفتح) تُدوَّن بسببها ونتيجتها، والأثر يسافر
// داخل الملف مع النسخة — بيانات رصد موجزة، لا نص مطالبات ولا مفاتيح.
export type ResearchTraceEntry = {
  stage: string;        // «البحث الأول» | «توسيع البحث» | «التثبيت بالفتح» | «استنفاد المحاولات»
  reason: string;       // لماذا نُفذت هذه الجولة أو لماذا توقف البحث
  claimIds: string[];   // الادعاءات المستهدفة
  outcome: string;      // خلاصة النتيجة
  at: string;
  durationMs?: number;
};

// ── بناء الملف من التمثيل ونتائج الباحث — حتمي بالكود ────────────────────────
// «مثبت» لا يُمنح إلا إذا: وُجد رابط + (للادعاء المتعلق بالمملكة) الرابط حكومي
// رسمي `.gov.sa` — بوابة السيادة داخل البناء نفسه.
export function buildDossier(
  intent: IntentRepresentation,
  findings: ClaimFinding[],
  isOfficialUrl: (url: string) => boolean
): SourceDossier {
  const sources: DossierSource[] = [];
  const sourceByUrl = new Map<string, DossierSource>();

  const claims: DossierClaim[] = intent.claims.map((c) => {
    if (!c.needsProof) {
      return { id: c.id, text: c.text, status: "عام مشروع" };
    }
    const f = findings.find((x) => x.claimId === c.id && x.status === "مثبت" && x.url);
    if (!f?.url) {
      return { id: c.id, text: c.text, status: "غير قابل للجزم" };
    }
    // بوابة السيادة: ادعاء المملكة لا يثبته إلا مصدر حكومي رسمي
    if (c.scope === "المملكة" && !isOfficialUrl(f.url)) {
      return { id: c.id, text: c.text, status: "محكوم بالمادة ١٠" };
    }
    let src = sourceByUrl.get(f.url);
    if (!src) {
      src = {
        id: `s${sources.length + 1}`,
        title: f.title || f.url,
        url: f.url,
        issuer: f.issuer,
        docType: f.docType,
        verificationStatus: "مسند بالتقرير",
        usedInContent: false,
        linkedClaimIds: [],
      };
      sources.push(src);
      sourceByUrl.set(f.url, src);
    }
    src.linkedClaimIds.push(c.id);
    return { id: c.id, text: c.text, status: "مثبت", sourceId: src.id, supportingExcerpt: f.excerpt };
  });

  return {
    claims,
    sources,
    intentSummary: `${intent.mainTopic} — ${intent.jurisdiction} — ${intent.infoType}`,
    researchedAt: new Date().toISOString(),
  };
}

// وسم الاستخدام الفعلي بعد التسليم: المصدر «استُخدم» إن ورد رابطه في النص
export function markUsedSources(dossier: SourceDossier, finalText: string): SourceDossier {
  return {
    ...dossier,
    sources: dossier.sources.map((s) => ({ ...s, usedInContent: finalText.includes(s.url) })),
  };
}

// اشتقاق الحقول القائمة من الملف (توافق خلفي — الشاشات القديمة لا تنكسر):
// «المصادر المستخدمة» = ما استند إليه ادعاء مثبت
export function deriveWebSources(dossier: SourceDossier): { title: string; url: string }[] {
  return dossier.sources
    .filter((s) => s.linkedClaimIds.length > 0)
    .map((s) => ({ title: s.title, url: s.url }));
}

// المقاطع الداعمة للادعاءات المثبتة — مدخل منفّذ المادة (١٠) بالخريطة
export function provenExcerpts(dossier: SourceDossier): string[] {
  return dossier.claims
    .filter((c) => c.status === "مثبت" && c.supportingExcerpt)
    .map((c) => c.supportingExcerpt as string);
}

// دمج نتائج تحقق المراجعة في الملف (بالرابط): «مؤكَّد» يرفع الحالة،
// و«غير مطابق» يخفضها — تحديث حالة لا إعادة بناء (المبدأ ٧)
export function mergeVerificationIntoDossier(
  dossier: SourceDossier,
  verified: { url: string; note?: string }[]
): SourceDossier {
  return {
    ...dossier,
    sources: dossier.sources.map((s) => {
      const v = verified.find((x) => x.url === s.url);
      if (!v?.note) return s;
      if (v.note.includes("غير مطابق")) return { ...s, verificationStatus: "غير مطابق" };
      if (v.note.includes("مؤكَّد") || v.note.includes("مؤكد")) return { ...s, verificationStatus: "مؤكد بالمراجعة" };
      return s;
    }),
  };
}
