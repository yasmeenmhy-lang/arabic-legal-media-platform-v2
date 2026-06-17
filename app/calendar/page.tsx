"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarDays, Edit3, Link2, Megaphone, MessageCircle, Save, ShieldAlert, Trash2, X } from "lucide-react";
import { DataTable, KpiGrid, ModuleTabs, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { contentKindOptions } from "@/lib/content-types";
import { formatDualDate } from "@/lib/dates";
import type { ContentKind, RiskLevel } from "@/lib/types";

type Priority = RiskLevel;

type CalendarItem = {
  id: string;
  title: string;
  contentType: ContentKind;
  channel: string;
  date: number;
  priority: Priority;
  reviewRef: string;
};

const channels = ["X", "LinkedIn", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];
const reviewRefs = ["نتيجة مراجعة 1042", "نتيجة مراجعة 1037", "نتيجة مراجعة 1029", "بانتظار الربط"];
const priorities: Priority[] = ["مرتفع", "متوسط", "منخفض"];
const priorityRank: Record<Priority, number> = { مرتفع: 0, متوسط: 1, منخفض: 2 };
const weekdayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const initialItems: CalendarItem[] = [
  { id: "cal-1", title: "منشور توعوي عن العقود", contentType: "post", channel: "X", date: 7, priority: "متوسط", reviewRef: "نتيجة مراجعة 1042" },
  { id: "cal-2", title: "حملة الإعلان المهني", contentType: "campaign", channel: "LinkedIn", date: 14, priority: "مرتفع", reviewRef: "بانتظار الربط" },
  { id: "cal-3", title: "فيديو قصير عن السرية", contentType: "script", channel: "YouTube", date: 21, priority: "مرتفع", reviewRef: "نتيجة مراجعة 1037" }
];

const campaignProposals = [
  ["التوعية بالعقود", "أفراد ورواد أعمال", "لينكدإن ومنصة إكس", <StatusBadge key="ready" tone="good">جاهز للمراجعة</StatusBadge>],
  ["سرية معلومات العميل", "عملاء محتملون", "فيديو قصير", <StatusBadge key="risk" tone="neutral">يتطلب ملاحظات امتثال</StatusBadge>],
  ["الإعلان المهني المنضبط", "منشآت قانونية", "منشورات متعددة", <StatusBadge key="draft" tone="neutral">مقترح تخطيطي</StatusBadge>]
];

function sortByPriority(items: CalendarItem[]) {
  return [...items].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const leadingBlanks = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const [items, setItems] = useState(initialItems);
  const [selectedDate, setSelectedDate] = useState(Math.min(today.getDate(), daysInMonth));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("محتوى توعوي مرتبط بنتيجة مراجعة");
  const [channel, setChannel] = useState<string>("LinkedIn");
  const [contentType, setContentType] = useState<ContentKind>("post");
  const [priority, setPriority] = useState<Priority>("متوسط");
  const [reviewRef, setReviewRef] = useState(reviewRefs[0]);

  const selectedItems = useMemo(() => sortByPriority(items.filter((item) => item.date === selectedDate)), [items, selectedDate]);
  const orderedItems = useMemo(() => sortByPriority(items), [items]);

  function resetForm() {
    setEditingId(null);
    setTitle("محتوى توعوي مرتبط بنتيجة مراجعة");
    setChannel("LinkedIn");
    setContentType("post");
    setPriority("متوسط");
    setReviewRef(reviewRefs[0]);
  }

  function saveItem() {
    if (editingId) {
      setItems((current) => current.map((item) => (item.id === editingId ? { ...item, title, channel, contentType, priority, reviewRef } : item)));
      resetForm();
      return;
    }

    setItems((current) => [...current, { id: `cal-${current.length + 1}-${selectedDate}`, title, channel, contentType, priority, reviewRef, date: selectedDate }]);
    resetForm();
  }

  function editItem(item: CalendarItem) {
    setEditingId(item.id);
    setSelectedDate(item.date);
    setTitle(item.title);
    setChannel(item.channel);
    setContentType(item.contentType);
    setPriority(item.priority);
    setReviewRef(item.reviewRef);
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التخطيط والنشر"
        title="التخطيط والنشر"
        description="تقويم موحد لتنظيم المواد الإعلامية والإعلانية: عرض شهري، ترتيب الأولوية، إدارة العناصر، وربط كل عنصر بنتيجة مراجعة قبل النشر، إلى جانب مقترحات الحملات التي تغذي هذا التقويم."
      />

      <ModuleTabs
        items={[
          { label: "التقويم", href: "#calendar", active: true },
          { label: "الحملات", href: "#campaigns" },
          { label: "جدولة النشر", href: "#publishing" },
          { label: "المحتوى المخطط", href: "#planned-content" },
          { label: "تخطيط القنوات", href: "#channels" }
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel id="calendar" className="overflow-hidden">
          <SectionTitle
            title="عرض الشهر"
            subtitle={`${formatDualDate(new Date(year, month, Math.min(selectedDate, daysInMonth)))} — اختر يوماً لعرض عناصره أو إضافة عنصر جديد.`}
          />
          <div className="mb-2 flex items-center gap-2 text-sm font-normal text-palm">
            <CalendarDays size={18} />
            الشهر الحالي
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink/55">
            {weekdayLabels.map((label) => (
              <span key={label} className="py-1 font-normal">{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const dayItems = sortByPriority(items.filter((item) => item.date === day));
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-20 overflow-hidden rounded-lg border p-1.5 text-right transition focus-ring ${selectedDate === day ? "border-palm bg-mint" : "border-line bg-white hover:border-palm"}`}
                >
                  <span className="font-normal">{day}</span>
                  {dayItems.slice(0, 2).map((item) => (
                    <span key={item.id} className="mt-1 block whitespace-normal break-words rounded-md bg-white px-1.5 py-0.5 leading-5 text-palm shadow-sm">{item.title}</span>
                  ))}
                  {dayItems.length > 2 ? <span className="mt-1 block text-[10px] text-ink/50">+{dayItems.length - 2}</span> : null}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <SectionTitle title={editingId ? "تعديل عنصر" : "إضافة عنصر"} subtitle="كل عنصر يُربط بنتيجة مراجعة وأولوية تساعد على ترتيب التنفيذ." />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-normal">
              اليوم المختار
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring" value={`${selectedDate} (${formatDualDate(new Date(year, month, selectedDate))})`} readOnly />
            </label>
            <label className="text-sm font-normal">
              نوع المحتوى
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={contentType} onChange={(event) => setContentType(event.target.value as ContentKind)}>
                {contentKindOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-normal">
              القناة
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>
                {channels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-normal">
              الأولوية
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {priorities.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-normal sm:col-span-2">
              نتيجة المراجعة المرتبطة
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={reviewRef} onChange={(event) => setReviewRef(event.target.value)}>
                {reviewRefs.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-normal sm:col-span-2">
              عنوان العنصر
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={saveItem} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-normal text-white focus-ring">
              <Save size={16} />
              {editingId ? "حفظ التعديل" : "حفظ العنصر"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-normal focus-ring">
                <X size={16} />
                إلغاء
              </button>
            ) : null}
            <Link href="/content-review" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-normal text-palm focus-ring">
              <Link2 size={16} />
              ربط بمراجعة محتوى
            </Link>
          </div>

          <div className="mt-5">
            <SectionTitle title="عناصر اليوم المختار" subtitle="مرتبة حسب الأولوية: مرتفع، متوسط، منخفض." />
            {selectedItems.length > 0 ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-normal">{item.title}</p>
                      <p className="text-xs leading-6 text-ink/60">{contentKindOptions.find((option) => option.value === item.contentType)?.label} - {item.channel} - {item.reviewRef}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={item.priority === "مرتفع" ? "gold" : item.priority === "متوسط" ? "neutral" : "good"}>{item.priority}</StatusBadge>
                      <button type="button" onClick={() => editItem(item)} className="rounded-md border border-line p-2 text-palm focus-ring" title="تعديل">
                        <Edit3 size={15} />
                      </button>
                      <button type="button" onClick={() => deleteItem(item.id)} className="rounded-md border border-line p-2 text-ink/60 focus-ring" title="حذف">
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

      <Panel id="planned-content" className="overflow-hidden">
        <SectionTitle title="جدول العناصر المخططة" subtitle="قائمة تشغيلية مرتبة حسب الأولوية، مع تاريخ هجري وميلادي وحالة الربط بالمراجعة." />
        <DataTable
          headers={["الموضوع", "الصيغة", "القناة", "الأولوية", "التاريخ", "نتيجة المراجعة", "الإجراء"]}
          rows={orderedItems.map((item) => [
            item.title,
            contentKindOptions.find((option) => option.value === item.contentType)?.label ?? item.contentType,
            item.channel,
            <StatusBadge key={`${item.id}-priority`} tone={item.priority === "مرتفع" ? "gold" : item.priority === "متوسط" ? "neutral" : "good"}>{item.priority}</StatusBadge>,
            formatDualDate(new Date(year, month, item.date)),
            <StatusBadge key={`${item.id}-status`} tone={item.reviewRef === "بانتظار الربط" ? "neutral" : "good"}>{item.reviewRef === "بانتظار الربط" ? "يتطلب ربط مراجعة" : "مرتبط بنتيجة مراجعة"}</StatusBadge>,
            <button key={`${item.id}-edit`} type="button" onClick={() => editItem(item)} className="font-normal text-palm underline underline-offset-4">
              تعديل
            </button>
          ])}
        />
      </Panel>

      <PageHeader
        eyebrow="الحملات"
        title="الحملات الإعلامية والإعلانية"
        description="تنظيم مقترحات الحملات والرسائل والجمهور والقنوات، مع إبقاء الامتثال والمخاطر وجاهزية النشر ضمن مسار المراجعة. ترتبط الحملات الجاهزة بعناصر في التقويم أعلاه."
      />

      <KpiGrid
        items={[
          { label: "حملات مقترحة", value: "6", hint: "مرتبطة بموضوعات مهنية", tone: "neutral", icon: <Megaphone size={20} /> },
          { label: "رسائل مقترحة", value: "18", hint: "تحتاج مراجعة قبل الاستخدام", tone: "gold", icon: <MessageCircle size={20} /> },
          { label: "ملاحظات مخاطر", value: "4", hint: "مرتبطة بالمحتوى الإعلاني", tone: "neutral", icon: <ShieldAlert size={20} /> },
          { label: "مرتبطة بالتقويم", value: "9", hint: "مواد مجدولة أو مقترحة", tone: "good", icon: <CalendarCheck size={20} /> }
        ]}
      />

      <Panel id="campaigns" className="overflow-hidden">
        <SectionTitle title="مقترحات الحملات" subtitle="تعرض كدعم تخطيطي، ولا تعني إطلاق الحملة أو تشغيلها آلياً." />
        <DataTable headers={["الحملة", "الجمهور المقترح", "القنوات", "الحالة"]} rows={campaignProposals} />
      </Panel>

      <div id="publishing" className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="جدولة النشر" subtitle="تظهر عناصر الجدولة من التقويم والعناصر المرتبطة بنتائج مراجعة." />
          <DataTable
            headers={["العنصر", "القناة", "التاريخ", "حالة الربط"]}
            rows={orderedItems.map((item) => [
              item.title,
              item.channel,
              formatDualDate(new Date(year, month, item.date)),
              item.reviewRef
            ])}
          />
        </Panel>
        <Panel id="channels">
          <SectionTitle title="تخطيط القنوات" subtitle="توزيع مختصر للقنوات المستخدمة في العناصر المخططة." />
          <DataTable
            headers={["القناة", "عدد العناصر"]}
            rows={channels.map((channelName) => [
              channelName,
              orderedItems.filter((item) => item.channel === channelName).length.toLocaleString("ar-SA")
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}
