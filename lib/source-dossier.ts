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

// ── نوع الوثيقة الرسمية (بقرار المالكة — الاستخراج بحسب النوع): ─────────────
// لا يُفترض أن كل مصدر يحتوي مواد مرقمة — لكل نوع منطق استخراج ومحدِّد موضع.
export type OfficialDocKind =
  | "نظام أو لائحة"
  | "أمر أو مرسوم أو قرار"
  | "إعلان أو خبر حكومي"
  | "دليل إرشادي"
  | "صفحة تعريفية"
  | "إحصاء أو بيان رسمي"
  // (بقرار المالكة: «المراجع ليست دائماً أنظمة — أي معلومة موثوقة من غير تحديد»)
  | "دراسة أو بحث علمي"
  | "مقالة أو تقرير صحفي";

// إخفاق ادعاء بمرحلته وسببه الفعلي — العطل التقني مميز عن غياب المصدر دائماً
// (بقرار المالكة: «لا يجوز وصف العطل التقني بأنه عدم وجود مصدر»)
export type ClaimFailure = {
  stage: string;      // من المراحل الاثنتي عشرة
  reason: string;     // السبب الفعلي — لا رسالة عامة
  technical: boolean; // تعذر تقني (الصفحة لم تُفتح) لا غياب للمصدر
};

// الدليل المستخرج من المصدر المفتوح فعلاً — وحدة الإثبات الفعلية:
// نص حرفي بمحدد موضعه (مادة/قرار/إعلان/قسم بحسب نوع الوثيقة)، مصنف الصلة
// («جوهري» يخل غيابه بفكرة المستخدم / «مساند» صحيح لكنه غير لازم).
export type ExtractedEvidence = {
  id: string;                  // معرف ثابت (e1, e2...)
  sourceId: string;
  docKind: OfficialDocKind;
  locator?: string;            // «المادة (٧٤)» | «قرار رقم … وتاريخ …» | «إعلان الجهة بتاريخ …» | «القسم …» — لا يُختلق حيث لا يوجد
  text: string;                // النص الحرفي كما ورد في الصفحة المفتوحة (مضاد الاختلاق يتحقق منه)
  natureLabel?: string;        // نص نظامي | واقعة معلنة | توجيه إرشادي | بيان تعريفي | إحصاء رسمي
  relevance: "جوهري" | "مساند";
  publishedAt?: string;        // تاريخ النشر أو النفاذ متى كان منشوراً (بوابة المستجدات)
  linkedClaimIds: string[];
};

// ادعاء مستخرج من فهم الطلب — وحدة الإثبات الأساسية
export type DossierClaim = {
  id: string;                 // معرف ثابت (c1, c2...)
  text: string;               // نص الادعاء
  status: "مثبت" | "غير قابل للجزم" | "محكوم بالمادة ١٠" | "عام مشروع";
  sourceId?: string;          // المصدر الذي يثبته
  supportingExcerpt?: string; // المقطع الداعم حرفياً من المصدر
  // هل الادعاء جوهري لتحقيق فكرة المستخدم؟ (يحكم سلوك الحجب/التسليم عند تعذر إثباته)
  essential?: boolean;
  // الأدلة المستخرجة التي أثبتته بعد فتح الصفحة فعلياً
  evidenceIds?: string[];
  // عند تعذر الإثبات: المرحلة والسبب الفعلي، والتقني مميز عن الغياب
  failure?: ClaimFailure;
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
  // نوع الوثيقة كما صُنف من محتواها المفتوح (لا من عنوانها)
  docKind?: OfficialDocKind;
  // قرار اختيار المصدر مسجلاً بسببه (الاختصاص/الأصل/الحداثة) — يُتتبع لاحقاً
  selectionReason?: string;
  // حالة الفتح الفعلي — الفتح شرط الإثبات (بقرار المالكة)
  fetchStatus?: "فُتح وتحقق" | "تعذر الفتح تقنياً" | "لم يُفتح";
};

export type SourceDossier = {
  claims: DossierClaim[];
  sources: DossierSource[];
  // الأدلة المستخرجة من الصفحات المفتوحة فعلاً — أساس الكتابة والإنفاذ
  evidence?: ExtractedEvidence[];
  // حكم اكتمال الإثبات للنص المسلَّم — يُحسب حتمياً ويسافر مع النسخة
  completeness?: CompletenessVerdict;
  // الملفات السابقة عند التحديث الصريح (بقرار المالكة: ثلاث نسخ بحد أقصى،
  // بتاريخ الاستبدال وسببه وطالبه وملخص الفروقات — ولا تُعدل النسخة بعد حفظها)
  previousDossiers?: DossierArchiveEntry[];
  intentSummary?: string;     // خلاصة التمثيل الدلالي
  article10?: { applied: boolean; stopped: boolean; notice?: string; failedStage?: string };
  researchedAt?: string;
  refreshedAt?: string;       // آخر تحديث بطلب صريح من المستخدم
  // أثر قرار البحث (جولاته وأسباب الانتقال بينها ونتائجها) — يسافر مع النسخة
  researchTrace?: ResearchTraceEntry[];
  // «الرسمية بالإثبات» (بقرار المالكة): نطاقات مواقع جهات أثبتت رسميتَها صفحةٌ
  // حكومية (gov.sa) مفتوحة فعلاً في هذا الملف بورود النطاق حرفياً في نصها —
  // لا قوائم يدوية؛ الإثبات من المحتوى المجلوب وحده ويوثق في الأثر
  attestedOfficialDomains?: string[];
};

// نسخة مؤرشفة من ملف الإثبات — تُحفظ عند التحديث الصريح ولا تُعدل بعد حفظها
export type DossierArchiveEntry = {
  replacedAt: string;    // تاريخ الاستبدال
  reason: string;        // سبب التحديث
  requestedBy: string;   // المستخدم أو العملية التي طلبت التحديث
  diffSummary: string;   // ملخص الفروقات في المصادر والادعاءات وحالات التحقق
  dossier: SourceDossier; // النسخة السابقة كما كانت (بلا أرشيفها المتداخل)
};

// ── التمثيل الدلالي — مخرج محرك الفهم (المرجع الأول، لا يُتجاوز) ──
export type IntentClaim = {
  id: string;
  text: string;
  needsProof: boolean;        // يحتاج إثباتاً بمصدر (بفئات المادة ١٠)
  whyNeedsProof?: string;
  scope: "المملكة" | "دولي" | "عام";
  // جوهري لتحقيق فكرة المستخدم (تعذر إثباته يستوجب الحجب لا التسليم العام) —
  // أم مساند يجوز حذفه دون إخلال بالفكرة
  essential?: boolean;
  // هل الادعاء نظامي (حكم/إجراء/التزام/عقوبة/مدة/اختصاص يخص جهات المملكة)؟
  // النظامي السعودي لا يثبته إلا مصدر حكومي؛ والبحثي/الإحصائي/الصحفي يقبل أي
  // مصدر موثوق بنسبته الصريحة (بقرار المالكة). غياب الحقل = نظامي احتياطاً.
  regulatory?: boolean;
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
  // ★ الأصل لا يُنسى (بقرار المالكة): ما وجده الباحث أولاً من موقع الجهة ورُفض
  // لمجرد أن رسميته لم تثبت بعد — يبقى محفوظاً مع النتيجة الحكومية البديلة،
  // فيُسترد فور ثبوت الرسمية بشهادة صفحة حكومية مفتوحة بلا أي بحث إضافي.
  originCandidate?: { url: string; excerpt?: string; issuer?: string; docType?: string; title?: string };
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
      const failed = findings.find((x) => x.claimId === c.id);
      return {
        id: c.id, text: c.text, status: "غير قابل للجزم", essential: c.essential,
        failure: { stage: "البحث الأول", reason: failed?.reason ?? "لم يُعثر على مصدر موثوق", technical: false },
      };
    }
    // بوابة السيادة (بقرار المالكة): الادعاء النظامي المتعلق بالمملكة لا يثبته
    // إلا مصدر حكومي رسمي — أما البحثي/الإحصائي/الصحفي فيقبل أي مصدر موثوق
    // بضوابط الوثيقة (الأصل والنسبة الصريحة). غياب صفة الادعاء = نظامي احتياطاً.
    if (c.scope === "المملكة" && c.regulatory !== false && !isOfficialUrl(f.url)) {
      return {
        id: c.id, text: c.text, status: "محكوم بالمادة ١٠", essential: c.essential,
        failure: { stage: "اختيار المصدر", reason: "المصدر المتاح غير حكومي والادعاء نظامي يخص المملكة — لا يثبته إلا مصدر حكومي رسمي", technical: false },
      };
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
    return { id: c.id, text: c.text, status: "مثبت", sourceId: src.id, supportingExcerpt: f.excerpt, essential: c.essential };
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

// المقاطع الداعمة للادعاءات المثبتة — مدخل منفّذ المادة (١٠) بالخريطة.
// تشمل نصوص الأدلة المستخرجة من الصفحات المفتوحة (الأقوى) ومقاطع الباحث.
export function provenExcerpts(dossier: SourceDossier): string[] {
  const provenIds = new Set(dossier.claims.filter((c) => c.status === "مثبت").map((c) => c.id));
  const fromClaims = dossier.claims
    .filter((c) => c.status === "مثبت" && c.supportingExcerpt)
    .map((c) => c.supportingExcerpt as string);
  const fromEvidence = (dossier.evidence ?? [])
    .filter((e) => e.linkedClaimIds.some((id) => provenIds.has(id)))
    .map((e) => e.text);
  return [...fromClaims, ...fromEvidence];
}

// ─── بوابة اكتمال الإثبات (بقرار المالكة — ضمن حوكمة المصادر، لا القاضي) ─────
// حكم حتمي بالكود يقارن حالة الملف بالنص النهائي: «لا يعد المحتوى جاهزاً» عند
// ادعاء بلا إثبات، أو مصدر لم يُفتح، أو حكم جوهري مستخرج أغفله النص، أو تفصيل
// خارج خريطة الإثبات — مع التمييز الصريح بين «جوهري أُغفل بما يخل» و«صحيح لكنه
// خارج نطاق الفكرة ولا يلزم ذكره»، وبين التعذر التقني وغياب المصدر.
export type CompletenessVerdict = {
  ready: boolean;
  claimsNeedingProof: number;
  claimsProven: number;
  unproven: { id: string; text: string; reason: string; technical: boolean; essential: boolean }[];
  // أدلة جوهرية مثبتة أغفلها النص — مانع («حكم جوهري أُغفل بما يخل بالمحتوى»)
  essentialEvidenceUnused: { evidenceId: string; locator?: string }[];
  // أدلة مساندة لم تُستخدم — «صحيحة لكنها خارج نطاق الفكرة ولا يلزم ذكرها» (لا تمنع)
  supportingEvidenceUnusedCount: number;
  // تفاصيل في النص خارج خريطة الإثبات (تسميات فئات فقط — معقّمة)
  unsupportedDetails: string[];
  sourcesOpened: number;
  sourcesFailedTechnically: number;
  reasons: string[];
};

// هل استُخدم الدليل في النص فعلاً؟ — كشف حتمي: وروده بمحدده أو بنافذة مطبَّعة من نصه
function normalizeForMatch(text: string): string {
  return text
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

export function evidenceUsedInText(evidence: ExtractedEvidence, finalText: string): boolean {
  const hay = normalizeForMatch(finalText);
  if (evidence.locator && hay.includes(normalizeForMatch(evidence.locator))) return true;
  const needle = normalizeForMatch(evidence.text);
  if (!needle.trim()) return false;
  const windowSize = 25;
  if (needle.length <= windowSize) return hay.includes(needle);
  for (let start = 0; start + windowSize <= needle.length; start += 10) {
    if (hay.includes(needle.slice(start, start + windowSize))) return true;
  }
  return false;
}

export function computeCompleteness(
  dossier: SourceDossier,
  finalText: string,
  opts?: { unsupportedDetails?: string[] }
): CompletenessVerdict {
  const proofClaims = dossier.claims.filter((c) => c.status !== "عام مشروع");
  const proven = proofClaims.filter((c) => c.status === "مثبت");
  const unproven = proofClaims
    .filter((c) => c.status !== "مثبت")
    .map((c) => ({
      id: c.id,
      text: c.text,
      reason: c.failure?.reason ?? (c.status === "محكوم بالمادة ١٠" ? "لا مصدر حكومي رسمي مختص يثبته" : "لم يكتمل إثباته"),
      technical: Boolean(c.failure?.technical),
      essential: c.essential !== false,
    }));
  const provenIds = new Set(proven.map((c) => c.id));
  const relevantEvidence = (dossier.evidence ?? []).filter((e) => e.linkedClaimIds.some((id) => provenIds.has(id)));
  const unusedEssential = relevantEvidence.filter((e) => e.relevance === "جوهري" && !evidenceUsedInText(e, finalText));
  const unusedSupporting = relevantEvidence.filter((e) => e.relevance === "مساند" && !evidenceUsedInText(e, finalText));
  const unsupportedDetails = opts?.unsupportedDetails ?? [];
  const sourcesOpened = dossier.sources.filter((s) => s.fetchStatus === "فُتح وتحقق").length;
  const sourcesFailedTechnically = dossier.sources.filter((s) => s.fetchStatus === "تعذر الفتح تقنياً").length;

  const reasons: string[] = [];
  for (const u of unproven) {
    reasons.push(
      u.technical
        ? `ادعاء ${u.essential ? "جوهري" : "مساند"} لم يثبت لتعذر تقني في فتح مصدره (وليس لغياب المصدر): ${u.reason}`
        : `ادعاء ${u.essential ? "جوهري" : "مساند"} بلا إثبات: ${u.reason}`
    );
  }
  if (unusedEssential.length > 0) {
    reasons.push(`حكم جوهري مستخرج أغفله النص بما يخل بالمحتوى (${unusedEssential.map((e) => e.locator ?? e.id).join("، ")})`);
  }
  if (unsupportedDetails.length > 0) {
    reasons.push(`النص يتضمن تفصيلاً خارج خريطة الإثبات: ${unsupportedDetails.join("، ")}`);
  }
  // ★ الحكم على النص المسلَّم لا على قائمة الادعاءات (بقرار مالكة المنصة —
  // تصحيح جذري): كان أي ادعاء لم يثبت يحجب القرار ولو لم يدخل النص أصلاً، فيخرج
  // نصٌّ نظيف تماماً بقرار «غير موصى بالنشر»، ويتغيّر القرار بحسب وصول ملف
  // المصادر من عدمه لا بحسب النص. الآن يحجب ما ورد في النص فعلاً: تفصيلة نظامية
  // بلا دليل (unsupportedDetails — يرصدها المنفّذ الحتمي)، أو حكم جوهري مستخرج
  // أغفله النص. والادعاء الذي لم يثبت ولم يدخل النص يُذكر في خريطة الاستناد
  // شفافيةً ولا يحجب — لأن النص لا يقول شيئاً غير مثبت.
  return {
    ready: unusedEssential.length === 0 && unsupportedDetails.length === 0,
    claimsNeedingProof: proofClaims.length,
    claimsProven: proven.length,
    unproven,
    essentialEvidenceUnused: unusedEssential.map((e) => ({ evidenceId: e.id, locator: e.locator })),
    supportingEvidenceUnusedCount: unusedSupporting.length,
    unsupportedDetails,
    sourcesOpened,
    sourcesFailedTechnically,
    reasons,
  };
}

// خلاصة الحالة الفعلية للملف — تُعرض في تفسير قرار النشر بالأعداد لا بعبارات عامة
export function describeEvidenceState(v: CompletenessVerdict): string {
  const parts = [
    `الادعاءات المحتاجة إثباتاً: ${v.claimsNeedingProof} — المثبت منها: ${v.claimsProven}`,
    v.unproven.length ? `غير المثبت: ${v.unproven.map((u) => `${u.id} (${u.technical ? "تعذر تقني" : u.reason})`).join("، ")}` : "",
    `المصادر المفتوحة المتحقق منها: ${v.sourcesOpened}${v.sourcesFailedTechnically ? ` — تعذر فتح ${v.sourcesFailedTechnically} تقنياً` : ""}`,
    v.essentialEvidenceUnused.length ? `أحكام جوهرية أغفلها النص: ${v.essentialEvidenceUnused.length}` : "",
    v.supportingEvidenceUnusedCount ? `أحكام مساندة صحيحة خارج نطاق الفكرة (لا يلزم ذكرها): ${v.supportingEvidenceUnusedCount}` : "",
    v.unsupportedDetails.length ? `تفاصيل خارج خريطة الإثبات: ${v.unsupportedDetails.length}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

// ─── أرشفة الملف السابق عند التحديث الصريح (بقرار المالكة) ───────────────────
// النسخة الحالية + ثلاث سابقة بحد أقصى؛ عند التجاوز تُحذف الأقدم فقط.
// كل نسخة سابقة تحمل: تاريخ الاستبدال، سبب التحديث، طالبه، وملخص الفروقات —
// ولا تُعدل بعد حفظها (تُخزن كما كانت، منزوعة الأرشيف المتداخل فلا تتضخم).
export function summarizeDossierDiff(oldD: SourceDossier, newD: SourceDossier): string {
  const oldUrls = new Set(oldD.sources.map((s) => s.url));
  const newUrls = new Set(newD.sources.map((s) => s.url));
  const added = [...newUrls].filter((u) => !oldUrls.has(u)).length;
  const removed = [...oldUrls].filter((u) => !newUrls.has(u)).length;
  const provenOld = oldD.claims.filter((c) => c.status === "مثبت").length;
  const provenNew = newD.claims.filter((c) => c.status === "مثبت").length;
  const changedVerification = newD.sources.filter((s) => {
    const prev = oldD.sources.find((o) => o.url === s.url);
    return prev && prev.verificationStatus !== s.verificationStatus;
  }).length;
  return [
    `المصادر: ${added} أُضيف، ${removed} أُزيل`,
    `الادعاءات المثبتة: ${provenOld} ← ${provenNew}`,
    changedVerification ? `حالات تحقق تغيرت: ${changedVerification}` : "",
  ].filter(Boolean).join(" · ");
}

export function archivePreviousDossier(
  newDossier: SourceDossier,
  previous: SourceDossier,
  reason: string,
  requestedBy: string
): SourceDossier {
  const entry: DossierArchiveEntry = {
    replacedAt: new Date().toISOString(),
    reason,
    requestedBy,
    diffSummary: summarizeDossierDiff(previous, newDossier),
    // النسخة السابقة كما كانت — منزوعة أرشيفها المتداخل فقط (منع التضخم التكراري)
    dossier: { ...previous, previousDossiers: undefined },
  };
  const carried = [...(previous.previousDossiers ?? []), entry];
  // الحد الأقصى ثلاث نسخ سابقة — تُحذف الأقدم فقط عند التجاوز
  const kept = carried.slice(-3);
  return { ...newDossier, previousDossiers: kept };
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
