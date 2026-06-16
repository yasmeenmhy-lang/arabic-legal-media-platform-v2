"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Save, X } from "lucide-react";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";

type PlannedItem = {
  id: string;
  title: string;
  contentType: string;
  channel: string;
  date: number;
  readiness: "ready" | "needs_review";
};

const initialItems: PlannedItem[] = [
  { id: "plan-1", title: "حماية العقود", contentType: "مقال", channel: "الموقع الإلكتروني", date: 10, readiness: "ready" },
  { id: "plan-2", title: "إعلان مهني", contentType: "منشور إعلاني", channel: "LinkedIn", date: 13, readiness: "needs_review" },
  { id: "plan-3", title: "سلسلة توعوية", contentType: "فيديو قصير", channel: "X", date: 18, readiness: "needs_review" }
];

export default function MediaPlanningPage() {
  const [items, setItems] = useState(initialItems);
  const [selectedDate, setSelectedDate] = useState(10);
  const [title, setTitle] = useState("محتوى توعوي مرتبط بنتيجة مراجعة");
  const [channel, setChannel] = useState("LinkedIn");
  const [contentType, setContentType] = useState("منشور إعلامي");

  const selectedItems = useMemo(() => items.filter((item) => item.date === selectedDate), [items, selectedDate]);

  function savePlan() {
    const existing = items.find((item) => item.date === selectedDate && item.title === title);
    if (existing) {
      setItems((current) =>
        current.map((item) =>
          item.id === existing.id ? { ...item, title, channel, contentType, readiness: "needs_review" } : item
        )
      );
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: `plan-${Date.now()}`,
        title,
        channel,
        contentType,
        date: selectedDate,
        readiness: "needs_review"
      }
    ]);
  }

  function clearSelectedDate() {
    setItems((current) => current.filter((item) => item.date !== selectedDate));
  }

  return (
    <>
      <PageHeader
        title="دعم التخطيط الإعلامي"
        description="مساحة استرشادية لتنظيم توقيت النشر والقنوات المقترحة وربط التخطيط بنتائج مراجعة المحتوى الإعلامي والإعلاني."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="text-palm" />
            <h3 className="font-extrabold">تقويم التخطيط</h3>
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
                  className={`min-h-20 rounded border p-2 text-right transition focus-ring ${
                    selectedDate === day ? "border-palm bg-mint" : "border-line bg-white hover:border-palm"
                  }`}
                >
                  <span className="font-bold">{day}</span>
                  {planned.slice(0, 2).map((item) => (
                    <p key={item.id} className="mt-2 truncate rounded bg-white px-1 py-1 text-palm">
                      {item.title}
                    </p>
                  ))}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 font-extrabold">تعديل مقترح التخطيط</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              التاريخ المختار
              <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" value={`اليوم ${selectedDate}`} readOnly />
            </label>
            <label className="text-sm font-bold">
              القناة المقترحة
              <select className="mt-2 w-full rounded border border-line bg-white px-3 py-2 focus-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>
                {["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube Shorts", "الموقع الإلكتروني"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              نوع المحتوى
              <select className="mt-2 w-full rounded border border-line bg-white px-3 py-2 focus-ring" value={contentType} onChange={(event) => setContentType(event.target.value)}>
                {["منشور إعلامي", "محتوى إعلاني", "مقال", "نص فيديو", "حملة إعلامية أو إعلانية"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              عنوان المقترح
              <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={savePlan} className="inline-flex items-center gap-2 rounded bg-palm px-4 py-2 text-sm font-bold text-white focus-ring">
              <Save size={16} />
              حفظ المقترح
            </button>
            <button type="button" onClick={clearSelectedDate} className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold focus-ring">
              <X size={16} />
              مسح اليوم
            </button>
            <Link href="/content-review" className="inline-flex items-center rounded border border-line bg-white px-4 py-2 text-sm font-bold text-palm focus-ring">
              ربط بمراجعة محتوى
            </Link>
          </div>

          <div className="mt-5">
            <h4 className="mb-3 font-bold">محتوى مرتبط باليوم المختار</h4>
            {selectedItems.length > 0 ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded border border-line p-3">
                    <div>
                      <p className="font-bold">{item.title}</p>
                      <p className="text-xs text-ink/60">{item.contentType} - {item.channel}</p>
                    </div>
                    <StatusBadge tone={item.readiness === "ready" ? "good" : "warn"}>
                      {item.readiness === "ready" ? "مناسب وفق نتيجة المراجعة" : "يتطلب مراجعة"}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-ink/65">لا توجد عناصر مرتبطة بهذا اليوم. يمكن إضافة مقترح أو ربطه بمراجعة محتوى.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <DataTable
          headers={["الموضوع المقترح", "الصيغة", "القناة المقترحة", "التاريخ المقترح", "نتيجة المراجعة"]}
          rows={items.map((item) => [
            item.title,
            item.contentType,
            item.channel,
            `اليوم ${item.date}`,
            <StatusBadge key={item.id} tone={item.readiness === "ready" ? "good" : "warn"}>
              {item.readiness === "ready" ? "مناسب وفق نتيجة المراجعة" : "يتطلب مراجعة"}
            </StatusBadge>
          ])}
        />
      </div>
    </>
  );
}
