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

export function buildConfidence(findings: ReviewFinding[], context: ReviewContext): AssessmentConfidence {
  const completeContext = [context.contentType, context.channel, context.audience, context.purpose].filter(Boolean).length;
  const highEvidence = findings.filter((finding) => finding.confidenceLevel === "مرتفع").length;
  const weakEvidence = findings.filter((finding) => finding.confidenceLevel === "منخفض").length;

  if ((findings.length === 0 && completeContext >= 3) || (findings.length > 0 && highEvidence === findings.length && completeContext >= 3)) {
    return {
      level: "High",
      label: "عالية",
      reason: "الأدلة محددة، وسياق المحتوى مكتمل، والمراجع الرسمية منطبقة بصورة مباشرة.",
      evidenceQuality: "عبارات واضحة مرتبطة بمراجع مسجلة وسياق مكتمل."
    };
  }
  if (weakEvidence > 0 || completeContext < 2) {
    return {
      level: "Low",
      label: "منخفضة",
      reason: "السياق أو الأدلة غير مكتملة بما يكفي لاتخاذ قرار نهائي دون مراجعة إضافية.",
      evidenceQuality: "تحتاج بعض العبارات أو بيانات السياق إلى توضيح."
    };
  }
  return {
    level: "Medium",
    label: "متوسطة",
    reason: "توجد أدلة قابلة للاستناد، مع بقاء بعض الجوانب التي تستفيد من مراجعة بشرية.",
    evidenceQuality: "الأدلة كافية للتوجيه الأولي وليست قطعية في جميع المواضع."
  };
}

export function buildReadinessDecision({
  complianceScore,
  riskLevel,
  languagePassed,
  approved,
  findings
}: {
  complianceScore: number;
  riskLevel: RiskLevel;
  languagePassed: boolean;
  approved: boolean;
  findings: ReviewFinding[];
}): ReadinessDecision {
  const blockers: string[] = [];
  if (!approved) blockers.push("اعتماد الإصدار الحالي");
  if (!languagePassed) blockers.push("معالجة ملاحظات اللغة والصياغة");
  if (riskLevel === "حرج" || riskLevel === "مرتفع") blockers.push("معالجة المخاطر المرتفعة قبل النشر");
  if (findings.some((finding) => finding.businessSeverity === "critical" && !finding.resolved)) {
    blockers.push("إغلاق الملاحظات الحرجة وإعادة التقييم");
  }
  if (complianceScore < 70) blockers.push("رفع مستوى الامتثال بعد تصحيح المخالفات");

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
    reasons: ["لا توجد ملاحظات مانعة، واجتاز المحتوى المراجعة اللغوية، وتم اعتماد الإصدار الحالي."],
    blockers: [],
    actions: ["يمكن تجهيز حزمة النشر للقناة المناسبة مع مراجعة النسخة النهائية قبل الإرسال."]
  };
}

export function buildPublicationDecision({
  confidence,
  readiness,
  findings,
  riskLevel
}: {
  confidence: AssessmentConfidence;
  readiness: ReadinessDecision;
  findings: ReviewFinding[];
  riskLevel: RiskLevel;
}): PublicationDecision {
  const critical = findings.filter((finding) => finding.businessSeverity === "critical" && !finding.resolved);
  if (critical.length > 0 || riskLevel === "حرج") {
    return {
      outcome: "NOT_RECOMMENDED",
      label: "غير موصى بالنشر",
      reason: "توجد ملاحظات حرجة قد تُنشئ تعرضاً مهنياً أو قانونياً ولا ينبغي النشر قبل معالجتها وإعادة التقييم.",
      blockers: readiness.blockers,
      actions: readiness.actions,
      recommended: false
    };
  }
  if (confidence.level === "Low" || riskLevel === "مرتفع") {
    return {
      outcome: "LEGAL_REVIEW_REQUIRED",
      label: "يتطلب مراجعة قانونية إضافية",
      reason: "الأدلة أو مستوى المخاطر لا يسمحان بتوصية نهائية آمنة دون مراجعة بشرية إضافية.",
      blockers: readiness.blockers,
      actions: readiness.actions,
      recommended: false
    };
  }
  if (readiness.level !== "جاهز للنشر" || findings.some((finding) => !finding.resolved)) {
    return {
      outcome: "RECOMMENDED_AFTER_FINDINGS",
      label: "موصى بالنشر بعد معالجة الملاحظات",
      reason: "يمكن أن يصبح المحتوى مناسباً للنشر بعد تنفيذ الإجراءات المحددة وإعادة التقييم واعتماد النسخة النهائية.",
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
