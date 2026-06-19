"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, Save, Target, Users } from "lucide-react";
import { PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons } from "@/components/social-icons";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";

type StageStatus = "مكتمل" | "قيد التنفيذ" | "قادم" | "محجوب";
type PlanningStage = { key: string; label: string; milestone: string; status: StageStatus; owner: string };

const defaultStages: PlanningStage[] = [
  { key: "idea", label: "فكرة المحتوى", milestone: "تحديد الموضوع والهدف والجمهور", status: "مكتمل", owner: "المحامي" },
  { key: "review", label: "المراجعة والامتثال", milestone: "تحليل الأدلة والمراجع والمخاطر", status: "قيد التنفيذ", owner: "المحامي والمنصة" },
  { key: "rewrite", label: "الصياغة الآمنة", milestone: "تطبيق التصحيحات وإعادة التقييم", status: "قادم", owner: "المحامي" },
  { key: "approval", label: "الاعتماد", milestone: "اعتماد النسخة النهائية نفسها", status: "محجوب", owner: "المحامي" },
  { key: "campaign", label: "إعداد الحملة", milestone: "تحديد الرسالة والقنوات والمخرجات", status: "محجوب", owner: "المحامي" },
  { key: "schedule", label: "الجدولة", milestone: "اختيار الموعد المناسب", status: "محجوب", owner: "المحامي" },
  { key: "preparation", label: "تجهيز النشر", milestone: "إنشاء الحزمة الخاصة بكل قناة", status: "محجوب", owner: "المحامي" },
  { key: "monitoring", label: "المتابعة", milestone: "متابعة الأداء والملاحظات", status: "محجوب", owner: "المحامي" },
  { key: "improvement", label: "التحسين", milestone: "تحديث الرسالة بناءً على النتائج", status: "محجوب", owner: "المحامي" }
];

const statusTone = (status: StageStatus) =>
  status === "مكتمل" ? "good" as const : status === "قيد التنفيذ" ? "neutral" as const : "gold" as const;

export default function CalendarPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [stages, setStages] = useState(defaultStages);
  const [targetDate, setTargetDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loaded = loadContentRecords();
    setRecords(loaded);
    setSelectedId(loaded[0]?.id ?? "");
    const saved = window.localStorage.getItem("lawyer-media:decision-workflow");
    if (saved) {
      try { setStages(JSON.parse(saved) as PlanningStage[]); } catch { setStages(defaultStages); }
    }
  }, []);

  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const version = selected?.versions.find((item) => item.version === selected.currentVersion);
  const review = version?.analysis;
  const recommendations = review?.channelRecommendations ?? [];
  const completed = stages.filter((stage) => stage.status === "مكتمل").length;

  const decisionSummary = useMemo(() => {
    if (!review) return "ابدأ بمراجعة محتوى فعلي لربط الخطة بقرار نشر وأدلة.";
    return review.publicationDecision.reason;
  }, [review]);

  function advanceStage(index: number) {
    const current = stages[index];
    if (!current || current.status === "محجوب") return;
    const next = stages.map((stage, stageIndex) => {
      if (stageIndex === index) return { ...stage, status: "مكتمل" as const };
      if (stageIndex === index + 1) return { ...stage, status: "قيد التنفيذ" as const };
      return stage;
    });
    setStages(next);
    window.localStorage.setItem("lawyer-media:decision-workflow", JSON.stringify(next));
    setMessage(`اكتملت مرحلة «${current.label}» وانتقل المسار إلى المرحلة التالية.`);
  }

  function saveSchedule() {
    if (!targetDate) return;
    window.localStorage.setItem("lawyer-media:target-publication-date", targetDate);
    setMessage("تم حفظ الموعد المستهدف ضمن الخطة الاسترشادية.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التخطيط الاسترشادي"
        title="مسار التخطيط والنشر"
        description="خطة مرئية تربط المحتوى بالمراجعة والاعتماد والقنوات والجدولة. المقترحات استرشادية ولا تضمن نتائج أو وصولاً محدداً."
      />

      <Panel>
        <SectionTitle title="المحتوى المرتبط بالخطة" subtitle="اختيار المحتوى يحدّث قرار النشر والجمهور والقنوات المقترحة تلقائياً." />
        {records.length ? (
          <select value={selected?.id} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3">
            {records.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}
          </select>
        ) : <p className="rounded-lg bg-paper p-4">لا يوجد محتوى محفوظ. ابدأ من مراجعة المحتوى.</p>}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <SectionTitle title="الهدف والقرار" subtitle="هذه المعلومات تشرح القرار الذي تساعد الخطة على تنفيذه." />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-paper p-4"><div className="flex items-center gap-2 text-palm"><Target size={18} /><p className="text-sm">الهدف</p></div><p className="mt-2 leading-7">{version?.purpose ?? "غير محدد"}</p></div>
            <div className="rounded-lg bg-paper p-4"><div className="flex items-center gap-2 text-palm"><Users size={18} /><p className="text-sm">الجمهور</p></div><p className="mt-2 leading-7">{version?.audience ?? "غير محدد"}</p></div>
          </div>
          <div className="mt-4 rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">قرار النشر الحالي</p>{review ? <StatusBadge tone={review.publicationDecision.recommended ? "good" : "gold"}>{review.publicationDecision.label}</StatusBadge> : null}</div>
            <p className="mt-3 leading-8 text-ink/75">{decisionSummary}</p>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="الجدول الزمني" subtitle="موعد مستهدف يساعد على ترتيب العمل ولا يمثل نشراً تلقائياً." />
          <label className="text-sm">تاريخ النشر المستهدف<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5" /></label>
          <button type="button" onClick={saveSchedule} disabled={!targetDate} className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Save size={16} />حفظ الموعد</button>
          <div className="mt-4 rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">تقدم الخطة</p><p className="mt-2 text-2xl font-semibold">{completed} من {stages.length} مراحل</p><p className="mt-2 text-sm leading-7 text-ink/65">يوضح المؤشر عدد المراحل المكتملة وما يلزم تنفيذه تالياً.</p></div>
        </Panel>
      </div>

      <Panel id="workflow">
        <SectionTitle title="المراحل والمعالم" subtitle="كل مرحلة تعرض حالتها، المسؤول عنها، المخرج المتوقع، والإجراء التالي." />
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.key} className={`grid gap-4 rounded-xl border p-4 md:grid-cols-[auto_1fr_1fr_auto] md:items-center ${stage.status === "قيد التنفيذ" ? "border-palm bg-mint/50" : "border-line bg-white"}`}>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-palm text-white">{index + 1}</span>
              <div><p className="font-semibold">{stage.label}</p><p className="mt-1 text-sm leading-6 text-ink/60">المسؤول: {stage.owner}</p></div>
              <div><p className="text-xs text-ink/50">المعلم المتوقع</p><p className="mt-1 text-sm leading-7">{stage.milestone}</p></div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={statusTone(stage.status)}>{stage.status}</StatusBadge>
                {stage.status === "قيد التنفيذ" ? <button type="button" onClick={() => advanceStage(index)} className="inline-flex items-center gap-1 rounded-md bg-palm px-3 py-2 text-xs text-white"><CheckCircle2 size={14} />إكمال</button> : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel id="channels">
        <SectionTitle title="القنوات المقترحة ومبرراتها" subtitle="لا تظهر قنوات فارغة أو أرقام بلا معنى؛ تظهر فقط التوصيات المدعومة ببيانات المحتوى." />
        {recommendations.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {recommendations.map((item) => {
              const Icon = socialBrandIcons[item.key];
              return (
                <article key={item.key} className="rounded-xl border border-line p-5">
                  <div className="flex items-center gap-3">{Icon ? <Icon size={28} /> : null}<h3 className="text-lg font-semibold">{item.channel}</h3></div>
                  <p className="mt-4 leading-7">{item.reason}</p>
                  <div className="mt-4 space-y-3 text-sm leading-7">
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
        ) : <p className="rounded-lg bg-paper p-4 leading-7">لا توجد توصية قناة قبل توفر تحليل فعلي وسياق مكتمل للمحتوى.</p>}
      </Panel>

      <div className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/60">
        هذا المقترح استرشادي، تم إنشاؤه بناءً على البيانات المدخلة ونتائج المراجعة والمراجع المهنية المسجلة في المنصة. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم.
      </div>
      {message ? <div className="flex items-center gap-2 rounded-lg bg-mint p-4 text-sm text-palm"><Clock3 size={17} />{message}<ChevronLeft size={15} /></div> : null}
    </div>
  );
}
