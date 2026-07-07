"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clipboard, Download, Edit3, FileDown, Share2 } from "lucide-react";
import { Button, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons, socialBrandStyles } from "@/components/social-icons";
import { getActiveContentSelection, loadContentRecords, setActiveContentSelection, type StoredContentRecord } from "@/lib/content-record-store";

// prefill: القناة تدعم تضمين النص في الرابط (X فقط) — البقية يُنسخ النص تلقائياً وتُفتح صفحة الإنشاء
const platforms: Array<{
  key: "x" | "linkedin" | "instagram" | "tiktok" | "snapchat" | "youtube_shorts";
  label: string;
  prefill: boolean;
  shareUrl: (text: string) => string;
}> = [
  { key: "x", label: "X", prefill: true, shareUrl: (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` },
  { key: "linkedin", label: "LinkedIn", prefill: false, shareUrl: () => "https://www.linkedin.com/feed/?shareActive=true" },
  { key: "instagram", label: "Instagram", prefill: false, shareUrl: () => "https://www.instagram.com/" },
  { key: "tiktok", label: "TikTok", prefill: false, shareUrl: () => "https://www.tiktok.com/upload" },
  { key: "snapchat", label: "Snapchat", prefill: false, shareUrl: () => "https://www.snapchat.com/" },
  { key: "youtube_shorts", label: "YouTube Shorts", prefill: false, shareUrl: () => "https://studio.youtube.com/" }
];

// المشاركة والنسخ يمرران نص المحتوى المعتمد فقط — بلا ترويسات أو بيانات أو تنبيهات إضافية
function prepareChannelCopy(input: { body: string }) {
  return input.body.trim();
}

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
  // تأكيد قياسي قبل كل مشاركة — التنبيه يظهر للمستخدم ولا يدخل النص المشارك
  const [confirmShare, setConfirmShare] = useState<
    { label: string; href: string; prefill: boolean } | null
  >(null);

  async function executeConfirmedShare() {
    if (!confirmShare) return;
    // يُنسخ النص دائماً حتى يمكن لصقه داخل القناة مباشرة
    try {
      await navigator.clipboard.writeText(prepareChannelCopy({ body }));
    } catch {
      /* بعض المتصفحات تمنع النسخ بعد فقدان التركيز — الفتح يستمر */
    }
    const opened = window.open(confirmShare.href, "_blank", "noopener,noreferrer");
    if (!opened) {
      setMessage(`نُسخ النص، وتعذر فتح ${confirmShare.label} تلقائياً — اسمح بالنوافذ المنبثقة أو افتح القناة يدوياً والصق النص.`);
    } else {
      setMessage(
        confirmShare.prefill
          ? `فُتحت نافذة ${confirmShare.label} والنص مضمّن فيها — راجعه ثم أكمل النشر.`
          : `فُتحت ${confirmShare.label} ونُسخ النص تلقائياً — الصقه في المنشور وأكمل النشر.`
      );
    }
    setConfirmShare(null);
  }

  useEffect(() => {
    const loaded = loadContentRecords();
    const activeSelection = getActiveContentSelection();
    const activeApprovedRecord = activeSelection
      ? loaded.find((item) =>
          item.id === activeSelection.contentId &&
          item.approvedVersion === activeSelection.version &&
          item.versions.some((version) => version.version === activeSelection.version && Boolean(version.approvedAt))
        )
      : undefined;
    setRecords(loaded);
    setSelectedId(activeApprovedRecord?.id ?? loaded.find((item) => item.approvedVersion)?.id ?? "");
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
      <Link href="/content-review" className="inline-flex rounded-md border border-line px-4 py-2 text-sm text-palm transition hover:border-palm hover:bg-mint focus-ring">
        عودة إلى نتائج المراجعة
      </Link>

      {approvedItems.length ? (
        <>
          <Panel>
            <SectionTitle title="المحتوى المعتمد" subtitle="تعرض القائمة النسخ التي اجتازت المراجعة واعتمدها المستخدم فقط." />
            <select value={selected?.record.id} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3">
              {approvedItems.map(({ record, version }) => <option key={record.id} value={record.id}>{record.title} — الإصدار {version.version}</option>)}
            </select>
            <div className="mt-4 rounded-lg bg-paper p-4 leading-8">{body}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary-gray" onClick={copy} leadingIcon={<Clipboard size={16} />}>نسخ</Button>
              <Button variant="secondary-gray" onClick={downloadPackage} leadingIcon={<Download size={16} />}>تنزيل الحزمة</Button>
              <Button variant="secondary-gray" onClick={edit} leadingIcon={<Edit3 size={16} />}>تحرير نسخة جديدة</Button>
              <Button onClick={() => window.print()} leadingIcon={<FileDown size={16} />}>طباعة / حفظ PDF</Button>
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
                    <button
                      type="button"
                      onClick={() => setConfirmShare({
                        label: platform.label,
                        href: platform.shareUrl(prepareChannelCopy({ body })),
                        prefill: platform.prefill,
                      })}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-palm px-[11px] py-[9px] text-sm font-medium text-white transition hover:bg-palmDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm"
                    ><Share2 size={15} />فتح المشاركة</button>
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

      {/* تأكيد قياسي قبل كل مشاركة */}
      {confirmShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold">تأكيد المشاركة — {confirmShare.label}</p>
                <p className="mt-2 text-sm leading-7 text-ink/75">
                  راجع النسخة النهائية داخل التطبيق المستهدف قبل النشر — تبقى مسؤولية النشر على المستخدم.
                </p>
                {!confirmShare.prefill ? (
                  <p className="mt-2 rounded-lg bg-mint p-2.5 text-xs leading-6 text-palm">
                    سيُنسخ نص المحتوى تلقائياً — الصقه داخل المنشور بعد فتح القناة.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-start gap-3">
              <Button onClick={() => void executeConfirmedShare()} leadingIcon={<Share2 size={15} />}>
                متابعة المشاركة
              </Button>
              <Button variant="secondary-gray" onClick={() => setConfirmShare(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
