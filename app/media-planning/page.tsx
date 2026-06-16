"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Edit3, Link2, Save, Trash2, X } from "lucide-react";
import { DataTable, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";

type PlannedItem = {
  id: string;
  title: string;
  contentType: string;
  channel: string;
  date: number;
  reviewRef: string;
  readiness: "ready" | "needs_review";
};

const initialItems: PlannedItem[] = [
  { id: "plan-1", title: "حماية العقود قبل التوقيع", contentType: "مقال", channel: "الموقع الإلكتروني", date: 10, reviewRef: "نتيجة مراجعة 1042", readiness: "ready" },
  { id: "plan-2", title: "إعلان مهني عن خدمات الشركات", contentType: "محتوى إعلاني", channel: "لينكدإن", date: 13, reviewRef: "بانتظار الربط", readiness: "needs_review" },
  { id: "plan-3", title: "سلسلة توعوية عن السرية", contentType: "فيديو قصير", channel: "منصة إكس", date: 18, reviewRef: "نتيجة مراجعة 1037", readiness: "needs_review" }
];

const channels = ["لينكدإن", "منصة إكس", "إنستغرام", "تيك توك", "سناب شات", "يوتيوب شورتس", "الموقع الإلكتروني"];
const contentTypes = ["منشور إعلامي", "محتوى إعلاني", "مقال", "نص فيديو", "حملة إعلامية أو إعلانية", "محتوى بصري"];
const reviewRefs = ["نتيجة مراجعة 1042", "نتيجة مراجعة 1037", "نتيجة مراجعة 1029", "بانتظار الربط"];

export default function MediaPlanningPage() {
  const [items, setItems] = useState(initialItems);
  const [selectedDate, setSelectedDate] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("محتوى توعوي مرتبط بنتيجة مراجعة");
  const [channel, setChannel] = useState("لينكدإن");
  const [contentType, setContentType] = useState("منشور إعلامي");
  const [reviewRef, setReviewRef] = useState("نتيجة مراجعة 1042");

  const selectedItems = useMemo(() => items.filter((item) => item.date === selectedDate), [items, selectedDate]);

  function resetForm() {
    setEditingId(null);
    setTitle("محتوى توعوي مرتبط بنتيجة مراجعة");
    setChannel("لينكدإن");
    setContentType("منشور إعلامي");
    setReviewRef("نتيجة مراجعة 1042");
  }

  function savePlan() {
    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? { ...item, title, channel, contentType, reviewRef, readiness: reviewRef === "بانتظار الربط" ? "needs_review" : "ready" }
            : item
        )
      );
      resetForm();
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: `plan-${Date.now()}`,
        title,
        channel,
        contentType,
        reviewRef,
        date: selectedDate,
        readiness: reviewRef === "بانتظار الربط" ? "needs_review" : "ready"
      }
    ]);
  }

  function editItem(item: PlannedItem) {
    setEditingId(item.id);
    setSelectedDate(item.date);
    setTitle(item.title);
    setChannel(item.channel);
    setContentType(item.contentType);
    setReviewRef(item.reviewRef);
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  function clearSelectedDate() {
    setItems((current) => current.filter((item) => item.date !== selectedDate));
    resetForm();
  }

  return (
    <>
      <PageHeader
        eyebrow="تخطيط إعلامي وإعلاني"
        title="التخطيط الإعلامي"
        description="تقويم تفاعلي لتنظيم المواد الإعلامية والإعلانية، وربط كل عنصر بنتيجة مراجعة محتوى قبل النشر أو التصدير."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <Panel>
          <SectionTitle title="التقويم التفاعلي" subtitle="اختر يوماً لإضافة عنصر، أو اضغط على عنصر قائم لتعديله أو حذفه." />
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-palm">
            <CalendarDays size={18} />
            الشهر الحالي
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {Array.from({ length: 28 }, (_, index) => {
              const day = index + 1;
              const planned = items.filter((item) => item.date === day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-24 rounded-lg border p-2 text-right transition focus-ring ${
                    selectedDate === day ? "border-palm bg-mint shadow-sm" : "border-line bg-white hover:border-palm"
                  }`}
                >
                  <span className="font-extrabold">{day}</span>
                  {planned.slice(0, 2).map((item) => (
                    <span key={item.id} className="mt-2 block truncate rounded-md bg-white px-1.5 py-1 text-palm shadow-sm">
                      {item.title}
                    </span>
                  ))}
                  {planned.length > 2 ? <span className="mt-1 block text-[11px] text-ink/50">+{planned.length - 2}</span> : null}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title={editingId ? "تعديل عنصر مخطط" : "إضافة عنصر تخطيطي"} subtitle="كل عنصر يجب ربطه بنتيجة مراجعة أو تمييزه كعنصر يحتاج مراجعة." />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-extrabold">
              التاريخ المختار
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring" value={`اليوم ${selectedDate}`} readOnly />
            </label>
            <label className="text-sm font-extrabold">
              القناة المقترحة
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>
                {channels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-extrabold">
              نوع المحتوى
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={contentType} onChange={(event) => setContentType(event.target.value)}>
                {contentTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-extrabold">
              نتيجة المراجعة المرتبطة
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={reviewRef} onChange={(event) => setReviewRef(event.target.value)}>
                {reviewRefs.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-extrabold sm:col-span-2">
              عنوان العنصر
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={savePlan} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-extrabold text-white focus-ring">
              <Save size={16} />
              {editingId ? "حفظ التعديل" : "حفظ العنصر"}
            </button>
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-extrabold focus-ring">
              <X size={16} />
              إلغاء
            </button>
            <button type="button" onClick={clearSelectedDate} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-extrabold focus-ring">
              <Trash2 size={16} />
              حذف عناصر اليوم
            </button>
            <Link href="/content-review" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-extrabold text-palm focus-ring">
              <Link2 size={16} />
              ربط بمراجعة محتوى
            </Link>
          </div>

          <div className="mt-5">
            <SectionTitle title="العناصر في اليوم المختار" />
            {selectedItems.length > 0 ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-extrabold">{item.title}</p>
                      <p className="text-xs leading-6 text-ink/60">{item.contentType} - {item.channel} - {item.reviewRef}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={item.readiness === "ready" ? "good" : "warn"}>
                        {item.readiness === "ready" ? "مرتبط بنتيجة مراجعة" : "يتطلب مراجعة"}
                      </StatusBadge>
                      <button type="button" onClick={() => editItem(item)} className="rounded-md border border-line p-2 text-palm focus-ring" title="تعديل">
                        <Edit3 size={15} />
                      </button>
                      <button type="button" onClick={() => deleteItem(item.id)} className="rounded-md border border-line p-2 text-red-700 focus-ring" title="حذف">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-ink/65">لا توجد عناصر مرتبطة بهذا اليوم. يمكن إضافة عنصر جديد أو ربطه بمراجعة محتوى.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel>
          <SectionTitle title="جدول العناصر المخططة" subtitle="قائمة تشغيلية للعناصر الإعلامية والإعلانية وحالة ارتباطها بالمراجعة." />
          <DataTable
            headers={["الموضوع", "الصيغة", "القناة", "التاريخ", "نتيجة المراجعة", "الإجراء"]}
            rows={items.map((item) => [
              item.title,
              item.contentType,
              item.channel,
              `اليوم ${item.date}`,
              <StatusBadge key={`${item.id}-status`} tone={item.readiness === "ready" ? "good" : "warn"}>
                {item.readiness === "ready" ? "مرتبط بنتيجة مراجعة" : "يتطلب مراجعة"}
              </StatusBadge>,
              <button key={`${item.id}-edit`} type="button" onClick={() => editItem(item)} className="font-extrabold text-palm underline underline-offset-4">
                تعديل
              </button>
            ])}
          />
        </Panel>
      </div>
    </>
  );
}
