"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Clock3, Save, Target, Users } from "lucide-react";
import { Button, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons, socialBrandStyles } from "@/components/social-icons";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";

type StageStatus = "مكتمل" | "قيد التنفيذ" | "قادم" | "قيد الانتظار";
type PlanningStage = { key: string; label: string; status: StageStatus };

const defaultStages: PlanningStage[] = [
  { key: "idea", label: "فكرة المحتوى", status: "قيد التنفيذ" },
  { key: "review", label: "المراجعة والامتثال", status: "قيد الانتظار" },
  { key: "rewrite", label: "الصياغة الآمنة", status: "قيد الانتظار" },
  { key: "approval", label: "الاعتماد", status: "قيد الانتظار" },
  { key: "campaign", label: "إعداد الحملة", status: "قيد الانتظار" },
  { key: "schedule", label: "الجدولة", status: "قيد الانتظار" },
  { key: "preparation", label: "تجهيز النشر", status: "قيد الانتظار" },
  { key: "monitoring", label: "المتابعة", status: "قيد الانتظار" },
  { key: "improvement", label: "التحسين", status: "قيد الانتظار" }
];

const statusTone = (status: StageStatus) =>
  status === "مكتمل" ? "good" as const : status === "قيد التنفيذ" ? "neutral" as const : "gold" as const;

export default function CalendarPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loaded = loadContentRecords();
    setRecords(loaded);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setTargetDate("");
      setMessage("");
      return;
    }
    setTargetDate(window.localStorage.getItem(`lawyer-media:target-publication-date:${selectedId}`) ?? "");
    setMessage("");
  }, [selectedId]);

  const selected = records.find((record) => record.id === selectedId);
  const version = selected?.versions.find((item) => item.version === selected.currentVersion);
  const review = version?.analysis;
  const recommendations = review?.channelRecommendations ?? [];
  const stages = useMemo<PlanningStage[]>(() => {
    if (!selected) return defaultStages;
    const approved = Boolean(selected.approvedVersion);
    const hasFindings = Boolean(review?.findings.length || review?.languageQuality.issues.length);
    const shared = selected.sharingStatus === "تمت المشاركة";
    const actualProgress = [
      { key: "idea", label: "فكرة المحتوى", complete: true },
      { key: "review", label: "المراجعة والامتثال", complete: Boolean(review) },
      { key: "rewrite", label: "الصياغة الآمنة", complete: Boolean(review) && (!hasFindings || approved) },
      { key: "approval", label: "الاعتماد", complete: approved },
      { key: "campaign", label: "إعداد الحملة", complete: approved && recommendations.length > 0 },
      { key: "schedule", label: "الجدولة", complete: Boolean(targetDate) },
      { key: "preparation", label: "تجهيز النشر", complete: shared },
      { key: "monitoring", label: "المتابعة", complete: false },
      { key: "improvement", label: "التحسين", complete: false }
    ];
    const currentIndex = actualProgress.findIndex((stage) => !stage.complete);
    return actualProgress.map((stage, index) => ({
      key: stage.key,
      label: stage.label,
      status: stage.complete ? "مكتمل" : index === currentIndex ? "قيد التنفيذ" : "قيد الانتظار"
    }));
  }, [recommendations.length, review, selected, targetDate]);
  const completed = stages.filter((stage) => stage.status === "مكتمل").length;
  const currentStageIndex = stages.findIndex((stage) => stage.status === "قيد التنفيذ");
  const progressIndex = currentStageIndex >= 0 ? currentStageIndex : Math.max(0, completed - 1);
  const progressPercent = stages.length > 1 ? Math.round((progressIndex / (stages.length - 1)) * 100) : 0;

  const decisionSummary = useMemo(() => {
    if (!selected) return "يبدأ التخطيط بعد اختيار محتوى مرتبط بالخطة. لن تظهر بيانات أو مراحل مكتملة لمحتوى غير محدد.";
    if (!review) return "ابدأ بمراجعة محتوى فعلي لربط الخطة بقرار نشر وأدلة.";
    return review.publicationDecision.reason;
  }, [review, selected]);

  function saveSchedule() {
    if (!selectedId || !targetDate) return;
    window.localStorage.setItem(`lawyer-media:target-publication-date:${selectedId}`, targetDate);
    setMessage("تم حفظ الموعد المستهدف للمحتوى المختار ضمن الخطة الاسترشادية.");
  }

  return (
    <div className="space-y-3 text-[12px] leading-5">
      <PageHeader
        eyebrow="التخطيط الاسترشادي"
        title="مسار التخطيط والنشر"
        description="خطة مرئية تربط المحتوى بالمراجعة والاعتماد والقنوات والجدولة. المقترحات استرشادية ولا تضمن نتائج أو وصولاً محدداً."
      />
      <Link href="/content-review" className="inline-flex rounded-md border border-line px-4 py-2 text-sm text-palm transition hover:border-palm hover:bg-mint focus-ring">
        عودة إلى نتائج المراجعة
      </Link>

      <Panel id="workflow" className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="mb-1.5">
          <SectionTitle title="الخط الزمني لمراحل التنفيذ" subtitle="يعكس حالة المحتوى الحالية تلقائياً من المراجعة والاعتماد والتجهيز." />
        </div>
        <div className="overflow-x-auto">
          <div className="relative min-w-[1040px] px-6 pb-2 pt-3">
            <span className="absolute inset-x-12 top-[27px] h-1 rounded-full bg-line" aria-hidden="true" />
            <span className="absolute right-12 top-[27px] h-1 rounded-full bg-palm transition-all" style={{ width: `calc((100% - 6rem) * ${progressPercent / 100})` }} aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-3">
              {stages.map((stage, index) => {
                const isCompleted = stage.status === "مكتمل";
                const isCurrent = stage.status === "قيد التنفيذ";
                return (
                  <div key={stage.key} className="flex min-w-[104px] flex-1 flex-col items-center text-center">
                    <span
                      className={`z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-semibold shadow-sm ${
                        isCompleted
                          ? "border-palm bg-palm text-white"
                          : isCurrent
                            ? "border-palm bg-white text-palm ring-[5px] ring-mint"
                            : "border-ink/30 bg-white text-ink/55"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <p className={`mt-2 max-w-[104px] truncate text-xs font-semibold ${isCurrent ? "text-palm" : isCompleted ? "text-ink" : "text-ink/75"}`}>{stage.label}</p>
                    <p className={`mt-0.5 text-[11px] leading-4 ${isCompleted ? "text-palm" : isCurrent ? "text-palm" : "text-ink/55"}`}>{stage.status}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="p-2.5 sm:p-3">
        <SectionTitle title="المحتوى المرتبط بالخطة" subtitle="اختيار المحتوى يحدّث قرار النشر والجمهور والقنوات المقترحة تلقائياً." />
        {records.length ? (
          <>
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3">
            <option value="">اختر محتوى</option>
            {records.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}
          </select>
          {!selected ? <p className="mt-3 rounded-lg bg-paper p-3 leading-7 text-ink/70">يبدأ التخطيط بعد اختيار محتوى. لن يتم عرض قرار نشر أو قنوات أو هدف أو جمهور أو جدول زمني مرتبط بمحتوى سابق.</p> : null}
          </>
        ) : <p className="rounded-lg bg-paper p-4">لا يوجد محتوى محفوظ. ابدأ من مراجعة المحتوى.</p>}
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="p-2.5 sm:p-3">
          <SectionTitle title="الهدف والقرار" subtitle="هذه المعلومات تشرح القرار الذي تساعد الخطة على تنفيذه." />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-paper p-3"><div className="flex items-center gap-2 text-palm"><Target size={16} /><p className="text-xs">الهدف</p></div><p className="mt-1 leading-6">{selected ? version?.purpose ?? "غير محدد" : "لا يوجد محتوى محدد"}</p></div>
            <div className="rounded-lg bg-paper p-3"><div className="flex items-center gap-2 text-palm"><Users size={16} /><p className="text-xs">الجمهور</p></div><p className="mt-1 leading-6">{selected ? version?.audience ?? "غير محدد" : "لا يوجد محتوى محدد"}</p></div>
          </div>
          <div className="mt-3 rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">قرار النشر الحالي</p>{selected && review ? <StatusBadge tone={review.publicationDecision.recommended ? "good" : "gold"}>{review.publicationDecision.label}</StatusBadge> : null}</div>
            <p className="mt-2 leading-6 text-ink/75">{decisionSummary}</p>
          </div>
        </Panel>

        <Panel className="p-2.5 sm:p-3">
          <SectionTitle title="الجدول الزمني" subtitle="موعد مستهدف يساعد على ترتيب العمل ولا يمثل نشراً تلقائياً." />
          <label className="text-sm">تاريخ النشر المستهدف<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} disabled={!selected} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 disabled:bg-paper disabled:text-ink/45" /></label>
          {!selected ? <p className="mt-2 rounded-lg bg-paper p-3 text-xs leading-6 text-ink/65">اختر محتوى قبل تحديد موعد النشر حتى لا يرتبط الجدول الزمني بمحتوى سابق.</p> : null}
          <Button onClick={saveSchedule} disabled={!selected || !targetDate} className="mt-3" leadingIcon={<Save size={15} />}>حفظ الموعد</Button>
          <div className="mt-3 rounded-lg bg-paper p-3"><p className="text-xs text-ink/55">تقدم الخطة</p><p className="mt-1 text-lg font-semibold">{completed} من {stages.length} مراحل</p><p className="mt-1 text-xs leading-6 text-ink/65">يوضح المؤشر المرحلة الحالية وما يلزم تنفيذه تالياً.</p></div>
        </Panel>
      </div>

      <Panel id="channels" className="p-2.5 sm:p-3">
        <SectionTitle title="القنوات المقترحة ومبرراتها" subtitle="لا تظهر قنوات فارغة أو أرقام بلا معنى؛ تظهر فقط التوصيات المدعومة ببيانات المحتوى." />
        {recommendations.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {recommendations.map((item) => {
              const Icon = socialBrandIcons[item.key];
              return (
                <article key={item.key} className={`rounded-xl border border-line p-4 ${socialBrandStyles[item.key]?.surface ?? "bg-white"}`}>
                  <div className="flex items-center gap-3">{Icon ? <Icon size={28} className={socialBrandStyles[item.key]?.icon} /> : null}<h3 className="text-base font-semibold">{item.channel}</h3></div>
                  <p className="mt-3 text-sm leading-7">{item.reason}</p>
                  <div className="mt-3 space-y-2 text-sm leading-7">
                    <p><b>الجمهور:</b> {item.targetAudience}</p>
                    <p><b>الصيغة:</b> {item.format}</p>
                    <p><b>الفائدة المتوقعة:</b> {item.expectedBenefit}</p>
                    <p><b>المخاطر أو القيود:</b> {item.risks}</p>
                    <p><b>التوقيت:</b> {item.timing}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className="rounded-lg bg-paper p-4 leading-7">{selected ? "لا توجد توصية قناة قبل توفر تحليل فعلي وسياق مكتمل للمحتوى." : "اختر محتوى لعرض القنوات المقترحة المرتبطة به فقط."}</p>}
      </Panel>

      <div className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/60">
        هذا المقترح استرشادي، تم إنشاؤه بناءً على البيانات المدخلة ونتائج المراجعة والمراجع المهنية المسجلة في المنصة. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم.
      </div>
      {message ? <div className="flex items-center gap-2 rounded-lg bg-mint p-4 text-sm text-palm"><Clock3 size={17} />{message}<ChevronLeft size={15} /></div> : null}
    </div>
  );
}
