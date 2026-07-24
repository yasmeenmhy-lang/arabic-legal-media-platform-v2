import type {
  AssessmentConfidence,
  ChannelRecommendation,
  ContentKind,
  DecisionWorkflowStage,
  PublicationDecision,
  ReadinessDecision,
  ReviewContext,
  ReviewFinding,
  ReviewReadinessStatus,
  RiskLevel,
  SocialPlatformKey
} from "@/lib/types";

const approvedStatuses: ReviewReadinessStatus[] = ["READY_FOR_PUBLISHING", "EXPORTED", "SHARED"];

// الثقة تتبع الامتثال فقط: أي محتوى غير ملتزم بقواعد السلوك المهني
// أو اللائحة التنفيذية لنظام المحاماة غير موثوق فيه.
export function buildConfidence(findings: ReviewFinding[]): AssessmentConfidence {
  const unresolved = findings.filter((finding) => !finding.resolved);
  if (unresolved.length > 0) {
    return {
      level: "Low",
      label: "غير موثوق",
      reason: "رُصدت مخالفات لقواعد السلوك المهني للمحامين أو اللائحة التنفيذية لنظام المحاماة، ومعالجتها شرط لاعتماد المحتوى والتوصية بنشره.",
      evidenceQuality: "توجد مخالفات مرصودة مرتبطة بالمراجع المسجلة."
    };
  }
  return {
    level: "High",
    label: "موثوق",
    reason: "لم تُرصد مخالفات لقواعد السلوك المهني أو اللائحة التنفيذية لنظام المحاماة.",
    evidenceQuality: "لا مخالفات مرتبطة بالمراجع المسجلة."
  };
}

export function buildReadinessDecision({
  complianceScore,
  riskScore,
  professionalismScore,
  riskLevel,
  languagePassed,
  approved,
  findings
}: {
  complianceScore: number;
  riskScore: number;
  professionalismScore: number;
  riskLevel: RiskLevel;
  languagePassed: boolean;
  approved: boolean;
  findings: ReviewFinding[];
}): ReadinessDecision {
  // البوابات الأربع نفسها المعروضة في «جاهزية النشر» التفصيلية (calculatePublishingReadiness) —
  // مصدر حقيقة واحد. كانت هذه الدالة تستخدم عتبات أخف (تتجاهل مخاطر «متوسط»، وتتجاهل مخالفة
  // غير حرجة إن كانت درجة الامتثال ≥ 70) فتُظهر «جاهز للنشر» رغم فشل البوابات التفصيلية —
  // تناقض بين الشارة الرئيسية والقائمة التفصيلية رصدته مالكة المنصة.
  const blockers: string[] = [];
  if (!languagePassed) blockers.push("معالجة ملاحظات اللغة والصياغة");
  // الامتثال حكم نظامي بوجود المخالفة أو عدمه — لا رقم أو نسبة له؛ أي مخالفة غير معالجة
  // (مهما كانت شدتها) تمنع «جاهز للنشر» مباشرة، لا عبر عتبة درجة مئوية.
  if (findings.some((finding) => !finding.resolved)) blockers.push("معالجة كل المخالفات القانونية والتنظيمية القائمة قبل اعتبار المحتوى جاهزاً للنشر");
  if (riskScore >= 20) blockers.push("خفض مستوى المخاطر قبل النشر");
  if (professionalismScore < 80) blockers.push("تحسين الالتزام بمعايير الجوانب المهنية");

  const actions = [...new Set([
    ...findings.filter((finding) => !finding.resolved).map((finding) => finding.suggestedSaferWording),
    !approved ? "راجع النسخة النهائية ثم اعتمد الإصدار نفسه." : ""
  ].filter(Boolean))];

  if (blockers.length > 0) {
    const critical = findings.some((finding) => finding.businessSeverity === "critical" && !finding.resolved);
    return {
      level: critical || complianceScore < 70 ? "غير جاهز" : complianceScore >= 80 ? "جاهز بعد تعديلات محدودة" : "يحتاج إلى معالجة",
      reasons: [
        critical ? "توجد ملاحظة حرجة تمنع التوصية بالنشر حالياً." : "لم تكتمل جميع شروط النشر الآمن.",
        `مستوى المخاطر الحالي: ${riskLevel}.`
      ],
      blockers,
      actions
    };
  }
  return {
    level: "جاهز للنشر",
    reasons: ["اجتاز المحتوى كل بوابات الجاهزية: الامتثال الكامل، المخاطر المنخفضة، الالتزام المهني، وجودة اللغة."],
    blockers: [],
    actions: ["يمكن تجهيز حزمة النشر للقناة المناسبة مع مراجعة النسخة النهائية قبل الإرسال."]
  };
}

export function buildPublicationDecision({
  confidence,
  readiness,
  findings,
  riskLevel,
  languageIssuesCount = 0
}: {
  confidence: AssessmentConfidence;
  readiness: ReadinessDecision;
  findings: ReviewFinding[];
  riskLevel: RiskLevel;
  // ★ بأمر مالكة المنصة (اتساق القرار مع الاعتماد): الملاحظة اللغوية أو الأسلوبية
  // مؤشر كأي مؤشر — وجودها يمنع «موصى بالنشر» كما يمنع الاعتماد، فلا يظهر قرار
  // موصى بالنشر لنسخة يتعذر اعتمادها منطقياً
  languageIssuesCount?: number;
}): PublicationDecision {
  // أي مخالفة غير معالجة ⇒ غير موصى بالنشر — المنصة استرشادية لا تمنع، لكنها لا توصي قبل المعالجة
  const unresolved = findings.filter((finding) => !finding.resolved);
  if (unresolved.length > 0 || riskLevel === "بالغ" || riskLevel === "حرج") {
    return {
      outcome: "NOT_RECOMMENDED",
      label: "غير موصى بالنشر",
      reason: unresolved.length > 0
        ? "المحتوى غير ملتزم بقواعد السلوك المهني للمحامين أو اللائحة التنفيذية لنظام المحاماة — لا يُوصى بنشره قبل معالجة المخالفات وإعادة التقييم."
        : "مستوى المخاطر مرتفع — لا يُوصى بالنشر قبل معالجة المخاطر وإعادة التقييم.",
      blockers: readiness.blockers,
      actions: readiness.actions,
      recommended: false
    };
  }
  if (confidence.level === "Low" || riskLevel === "مرتفع") {
    return {
      outcome: "LEGAL_REVIEW_REQUIRED",
      label: "غير موصى بالنشر",
      reason: riskLevel === "مرتفع"
        ? "مستوى المخاطر مرتفع — عالِج المخاطر المرصودة وأعد التقييم قبل النشر."
        : "الأدلة الحالية غير كافية لتوصية آمنة — راجِع المحتوى واستكمل ما يلزم قبل النشر.",
      blockers: readiness.blockers,
      actions: readiness.actions,
      recommended: false
    };
  }
  if (readiness.level !== "جاهز للنشر" || findings.some((finding) => !finding.resolved) || languageIssuesCount > 0) {
    return {
      outcome: "RECOMMENDED_AFTER_FINDINGS",
      label: "موصى بالنشر بعد معالجة الملاحظات",
      reason: languageIssuesCount > 0
        ? "توجد ملاحظات لغوية أو أسلوبية لم تُعالج بعد — عالجها ثم أعد التقييم ليصبح المحتوى قابلاً للاعتماد والنشر."
        : "يمكن أن يصبح المحتوى مناسباً للنشر بعد تنفيذ الإجراءات المحددة وإعادة التقييم واعتماد النسخة النهائية.",
      blockers: readiness.blockers,
      actions: readiness.actions,
      recommended: false
    };
  }
  return {
    outcome: "RECOMMENDED",
    label: "موصى بالنشر",
    reason: "اجتاز المحتوى متطلبات الامتثال والمخاطر واللغة، وتم اعتماد الإصدار النهائي.",
    blockers: [],
    actions: readiness.actions,
    recommended: true
  };
}

type ChannelRule = {
  key: SocialPlatformKey;
  channel: string;
  formats: ContentKind[];
  audienceSignals: string[];
  format: string;
  benefit: string;
  timing: string;
  hashtags: string[];
};

const channelRules: ChannelRule[] = [
  { key: "linkedin", channel: "LinkedIn", formats: ["post", "article", "campaign", "advertisement"], audienceSignals: ["منشآت", "رواد", "قطاع", "زملاء"], format: "منشور مهني أو مقال موجز", benefit: "الوصول إلى جمهور مهني وبناء حضور معرفي.", timing: "أيام العمل صباحاً", hashtags: ["#وعي_قانوني", "#المحاماة"] },
  { key: "x", channel: "X", formats: ["post", "caption", "campaign"], audienceSignals: ["الجمهور", "أفراد", "وعي"], format: "رسالة توعوية مختصرة أو سلسلة", benefit: "الوصول السريع وتبسيط الرسالة القانونية.", timing: "الفترة المسائية أو وقت الحدث", hashtags: ["#توعية_قانونية"] },
  { key: "instagram", channel: "Instagram", formats: ["visual_content", "infographic", "campaign", "caption"], audienceSignals: ["الجمهور", "أفراد"], format: "تصميم بصري أو شرائح توعوية", benefit: "تحويل المعلومة إلى عرض بصري سهل الفهم.", timing: "المساء", hashtags: ["#معلومة_قانونية", "#وعي"] },
  { key: "tiktok", channel: "TikTok", formats: ["script", "visual_content"], audienceSignals: ["الجمهور", "أفراد"], format: "فيديو توعوي قصير", benefit: "شرح نقطة واحدة بلغة مباشرة لجمهور واسع.", timing: "المساء وعطلة نهاية الأسبوع", hashtags: ["#قانون", "#توعية"] },
  { key: "snapchat", channel: "Snapchat", formats: ["script", "visual_content"], audienceSignals: ["أفراد", "الجمهور"], format: "لقطات قصيرة متتابعة", benefit: "تقديم تذكير توعوي سريع وسهل الاستيعاب.", timing: "المساء", hashtags: [] },
  { key: "youtube_shorts", channel: "YouTube Shorts", formats: ["script", "visual_content"], audienceSignals: ["الجمهور", "منشآت"], format: "فيديو قصير قابل للبحث", benefit: "إتاحة شرح مختصر يمكن الرجوع إليه لاحقاً.", timing: "منتصف الأسبوع مساءً", hashtags: ["#Shorts", "#وعي_قانوني"] }
];

export function buildChannelRecommendations(
  kind: ContentKind,
  context: ReviewContext,
  findings: ReviewFinding[],
  readiness: ReadinessDecision
): ChannelRecommendation[] {
  const audience = context.audience || "الجمهور المستهدف المحدد";
  const selected = channelRules
    .map((rule) => {
      const kindMatch = rule.formats.includes(kind);
      const audienceMatch = rule.audienceSignals.some((signal) => `${context.audience} ${context.purpose}`.includes(signal));
      const explicitMatch = context.channel?.toLowerCase().includes(rule.channel.toLowerCase());
      return { rule, value: (kindMatch ? 3 : 0) + (audienceMatch ? 2 : 0) + (explicitMatch ? 3 : 0) };
    })
    .filter((item) => item.value >= 2)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return selected.map(({ rule, value }) => ({
    key: rule.key,
    channel: rule.channel,
    suitability: value >= 5 ? "عالية" : "متوسطة",
    reason: `تتلاءم مع ${kind === "article" ? "الطرح التفصيلي" : kind === "script" ? "المحتوى المرئي القصير" : "طبيعة الرسالة والجمهور"} بناءً على بيانات المحتوى المدخلة.`,
    targetAudience: audience,
    format: rule.format,
    objective: context.purpose || "رفع الوعي المهني",
    expectedBenefit: rule.benefit,
    risks: findings.length ? "يجب تطبيق التصحيحات واعتماد النسخة قبل تجهيزها للقناة." : "لا توجد مخاطر خاصة بالقناة بعد الالتزام بالنسخة المعتمدة.",
    readiness: readiness.level,
    contentDirection: findings.length ? "استخدم الصياغة الآمنة المقترحة وتجنب العبارات القطعية." : "حافظ على الطابع التوعوي واللغة المهنية الواضحة.",
    hashtags: rule.hashtags,
    timing: rule.timing,
    recommended: true
  }));
}

export function buildDecisionWorkflow(decision: PublicationDecision, hasRewrite: boolean, approved: boolean): DecisionWorkflowStage[] {
  const blocked = decision.outcome === "NOT_RECOMMENDED" || decision.outcome === "LEGAL_REVIEW_REQUIRED";
  return [
    { key: "input", label: "إدخال المحتوى", status: "مكتمل", reason: "تم توفير النص وسياقه.", action: "راجع البيانات عند الحاجة." },
    { key: "analysis", label: "التحليل", status: "مكتمل", reason: "تم تحليل المحتوى وربط النتائج بالأدلة.", action: "ابدأ بأعلى الملاحظات أولوية." },
    { key: "findings", label: "معالجة الملاحظات", status: decision.outcome === "RECOMMENDED" ? "مكتمل" : "الحالي", reason: decision.reason, action: decision.actions[0] ?? "راجع النتائج." },
    { key: "rewrite", label: "الصياغة المقترحة", status: hasRewrite ? "قادم" : decision.outcome === "RECOMMENDED" ? "مكتمل" : "قيد الانتظار", reason: hasRewrite ? "توجد صياغة أكثر أماناً قابلة للتطبيق." : "لا توجد صياغة مطلوبة أو متاحة.", action: hasRewrite ? "راجع الصياغة وطبّقها ثم أعد التحليل." : "انتقل للخطوة التالية." },
    { key: "approval", label: "اعتماد النسخة", status: approved ? "مكتمل" : blocked ? "قيد الانتظار" : "قادم", reason: approved ? "تم اعتماد النسخة الحالية." : "الاعتماد مطلوب للنسخة النهائية فقط.", action: approved ? "انتقل إلى تجهيز النشر." : "أكمل المعالجة ثم اعتمد النسخة." },
    { key: "sharing", label: "المشاركة والتصدير", status: decision.recommended ? "قادم" : "قيد الانتظار", reason: decision.recommended ? "يمكن تجهيز الحزم المعتمدة." : "لا تتاح المخرجات قبل استكمال المتطلبات.", action: decision.recommended ? "اختر القناة وصيغة الحزمة." : "أكمل الحواجز الظاهرة أولاً." }
  ];
}
