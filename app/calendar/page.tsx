"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Edit3, Save, Trash2 } from "lucide-react";
import { DataTable, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";

type CalendarItem = {
  id: string;
  title: string;
  date: number;
  channel: string;
  review: string;
};

const initialItems: CalendarItem[] = [
  { id: "cal-1", title: "منشور توعوي عن العقود", date: 7, channel: "منصة إكس", review: "نتيجة مراجعة 1042" },
  { id: "cal-2", title: "حملة الإعلان المهني", date: 14, channel: "لينكدإن", review: "بانتظار الربط" },
  { id: "cal-3", title: "فيديو قصير عن السرية", date: 21, channel: "يوتيوب شورتس", review: "نتيجة مراجعة 1037" }
];

export default function CalendarPage() {
  const [items, setItems] = useState(initialItems);
  const [selectedDate, setSelectedDate] = useState(7);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("مادة إعلامية مرتبطة بالمراجعة");
  const [channel, setChannel] = useState("لينكدإن");
  const [review, setReview] = useState("نتيجة مراجعة 1042");

  const selectedItems = useMemo(() => items.filter((item) => item.date === selectedDate), [items, selectedDate]);

  function saveItem() {
    if (editingId) {
      setItems((current) => current.map((item) => (item.id === editingId ? { ...item, title, channel, review } : item)));
      setEditingId(null);
      return;
    }

    setItems((current) => [...current, { id: `cal-${Date.now()}`, title, date: selectedDate, channel, review }]);
  }

  function editItem(item: CalendarItem) {
    setEditingId(item.id);
    setSelectedDate(item.date);
    setTitle(item.title);
    setChannel(item.channel);
    setReview(item.review);
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التقويم التفاعلي"
        title="التقويم التفاعلي"
        description="تقويم مستقل لتحديد تواريخ النشر المقترحة، إضافة العناصر، تعديلها، حذفها، وربطها بنتائج مراجعة المحتوى."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel>
          <SectionTitle title="أيام الشهر" subtitle="اختر يوماً لعرض العناصر أو إضافة عنصر جديد." />
          <div className="grid grid-cols-7 gap-2 text-xs">
            {Array.from({ length: 30 }, (_, index) => {
              const day = index + 1;
              const dayItems = items.filter((item) => item.date === day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-24 rounded-lg border p-2 text-right transition focus-ring ${selectedDate === day ? "border-palm bg-mint" : "border-line bg-white hover:border-palm"}`}
                >
                  <span className="font-extrabold">{day}</span>
                  {dayItems.map((item) => (
                    <span key={item.id} className="mt-2 block truncate rounded-md bg-white px-2 py-1 text-palm shadow-sm">{item.title}</span>
                  ))}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title={editingId ? "تعديل عنصر" : "إضافة عنصر"} subtitle="اربط العنصر بنتيجة مراجعة عند توفرها قبل التصدير أو المشاركة." />
          <div className="space-y-3">
            <label className="block text-sm font-extrabold">اليوم المختار<input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring" value={`اليوم ${selectedDate}`} readOnly /></label>
            <label className="block text-sm font-extrabold">عنوان العنصر<input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="block text-sm font-extrabold">القناة<select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>{["لينكدإن", "منصة إكس", "إنستغرام", "تيك توك", "سناب شات", "يوتيوب شورتس"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block text-sm font-extrabold">نتيجة المراجعة<select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={review} onChange={(event) => setReview(event.target.value)}>{["نتيجة مراجعة 1042", "نتيجة مراجعة 1037", "بانتظار الربط"].map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={saveItem} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-extrabold text-white focus-ring"><Save size={16} />حفظ</button>
            <Link href="/content-review" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-extrabold text-palm focus-ring"><CalendarPlus size={16} />ربط بمراجعة</Link>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="عناصر اليوم المختار" subtitle="يمكن تعديل أو حذف أي عنصر من التقويم." />
        <DataTable
          headers={["العنوان", "القناة", "نتيجة المراجعة", "الحالة", "الإجراءات"]}
          rows={selectedItems.map((item) => [
            item.title,
            item.channel,
            item.review,
            <StatusBadge key={`${item.id}-status`} tone={item.review === "بانتظار الربط" ? "warn" : "good"}>{item.review === "بانتظار الربط" ? "يتطلب ربط مراجعة" : "مرتبط بنتيجة مراجعة"}</StatusBadge>,
            <div key={`${item.id}-actions`} className="flex gap-2">
              <button type="button" onClick={() => editItem(item)} className="rounded-md border border-line p-2 text-palm focus-ring" title="تعديل"><Edit3 size={15} /></button>
              <button type="button" onClick={() => deleteItem(item.id)} className="rounded-md border border-line p-2 text-red-700 focus-ring" title="حذف"><Trash2 size={15} /></button>
            </div>
          ])}
        />
      </Panel>
    </div>
  );
}
