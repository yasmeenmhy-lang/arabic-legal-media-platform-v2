"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clipboard, Download, Edit3, FileDown, Share2 } from "lucide-react";
import { PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons, socialBrandStyles } from "@/components/social-icons";
import { loadContentRecords, setActiveContentSelection, type StoredContentRecord } from "@/lib/content-record-store";

const platforms: Array<{
  key: "x" | "linkedin" | "instagram" | "tiktok" | "snapchat" | "youtube_shorts";
  label: string;
  share?: (text: string) => string;
}> = [
  { key: "x", label: "X", share: (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` },
  { key: "linkedin", label: "LinkedIn", share: (_text: string) => "https://www.linkedin.com/feed/?shareActive=true" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "snapchat", label: "Snapchat" },
  { key: "youtube_shorts", label: "YouTube Shorts" }
];

function download(name: string, body: string) {
  const blob = new Blob([body], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SocialMediaPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loaded = loadContentRecords();
    setRecords(loaded);
    setSelectedId(loaded.find((item) => item.approvedVersion)?.id ?? "");
  }, []);

  const approvedItems = useMemo(() => records.flatMap((record) => {
    const version = record.versions.find((item) => item.version === record.approvedVersion);
    return version ? [{ record, version }] : [];
  }), [records]);
  const selected = approvedItems.find((item) => item.record.id === selectedId) ?? approvedItems[0];
  const body = selected?.version.body ?? "";

  async function copy() {
    await navigator.clipboard.writeText(body);
    setMessage("تم نسخ النص المعتمد.");
  }

  function downloadPackage() {
    if (!selected) return;
    download("حزمة-النشر-المعتمدة.json", JSON.stringify({
      title: selected.record.title,
      body,
      approval: "معتمد",
      publicationDecision: selected.version.analysis?.publicationDecision,
      channels: selected.version.analysis?.channelRecommendations,
      references: selected.version.references
    }, null, 2));
    setMessage("تم تنزيل الحزمة المعتمدة.");
  }

  function edit() {
    if (!selected) return;
    setActiveContentSelection(selected.record.id, selected.version.version);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المشاركة والتصدير"
        title="تجهيز مخرجات النشر المعتمدة"
        description="اختر نسخة معتمدة، ثم انسخها أو عدّلها أو نزّل حزمها أو افتح قناة المشاركة. لا تنشر المنصة تلقائياً نيابة عن المستخدم."
      />

      {approvedItems.length ? (
        <>
          <Panel>
            <SectionTitle title="المحتوى المعتمد" subtitle="تعرض القائمة النسخ التي اجتازت المراجعة واعتمدها المستخدم فقط." />
            <select value={selected?.record.id} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3">
              {approvedItems.map(({ record, version }) => <option key={record.id} value={record.id}>{record.title} — الإصدار {version.version}</option>)}
            </select>
            <div className="mt-4 rounded-lg bg-paper p-4 leading-8">{body}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Clipboard size={16} />نسخ</button>
              <button type="button" onClick={downloadPackage} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Download size={16} />تنزيل الحزمة</button>
              <Link onClick={edit} href="/content-review#input" className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Edit3 size={16} />تحرير نسخة جديدة</Link>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white"><FileDown size={16} />طباعة / حفظ PDF</button>
            </div>
            {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
          </Panel>

          <Panel>
            <SectionTitle title="تجهيز القنوات" subtitle="كل إجراء يعمل: القنوات ذات رابط مشاركة تفتح مباشرة، والبقية تنسخ النص مع إرشاد واضح للإكمال اليدوي." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {platforms.map((platform) => {
                const Icon = socialBrandIcons[platform.key];
                const recommendation = selected?.version.analysis?.channelRecommendations.find((item) => item.key === platform.key);
                return (
                  <article key={platform.key} className="rounded-xl border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${socialBrandStyles[platform.key]?.surface ?? "bg-paper"}`}>{Icon ? <Icon size={28} className={socialBrandStyles[platform.key]?.icon} /> : null}<h3 className="font-semibold">{platform.label}</h3></div>
                      <StatusBadge tone={recommendation ? "good" : "neutral"}>{recommendation ? "موصى بها" : "إعداد يدوي"}</StatusBadge>
                    </div>
                    <p className="mt-4 text-sm leading-7">{recommendation?.reason ?? "يمكن إعداد نسخة لهذه القناة بعد تكييف الصيغة بصرياً ومراجعتها."}</p>
                    <p className="mt-3 text-xs leading-6 text-ink/60">{recommendation?.risks ?? "راجع طول النص والخصوصية وسياسات المنصة قبل النشر."}</p>
                    {platform.share ? (
                      <a href={platform.share(body)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm text-white"><Share2 size={15} />فتح المشاركة</a>
                    ) : (
                      <button type="button" onClick={async () => { await navigator.clipboard.writeText(body); setMessage(`تم نسخ النص. افتح ${platform.label} وأكمل التجهيز يدوياً.`); }} className="mt-4 inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm"><Clipboard size={15} />نسخ للتجهيز</button>
                    )}
                  </article>
                );
              })}
            </div>
          </Panel>
        </>
      ) : (
        <Panel>
          <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-center">
            <p className="font-semibold">لا توجد نسخة معتمدة متاحة للمشاركة</p>
            <p className="mt-2 leading-7 text-ink/65">راجع المحتوى، عالج الملاحظات، ثم اعتمد النسخة النهائية لتفعيل جميع إجراءات المشاركة والتصدير.</p>
            <Link href="/content-review" className="mt-4 inline-flex rounded-md bg-palm px-4 py-2.5 text-white">فتح مراجعة المحتوى</Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
