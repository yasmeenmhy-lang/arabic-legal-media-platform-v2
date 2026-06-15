"use client";

import { Copy, Download, Share2 } from "lucide-react";
import { PageHeader, Panel, StatusBadge } from "@/components/ui";
import { advisoryDisclaimer } from "@/lib/governance";
import { buildShareUrl, shareReadyContent, socialPlatforms } from "@/lib/services/social-media-service";

const content = shareReadyContent[0];
const shareText = `${content.title}\n\n${content.body}\n\n${content.hashtags.join(" ")}`;

export default function SocialMediaPage() {
  async function copyContent() {
    await navigator.clipboard?.writeText(shareText);
  }

  async function webShare() {
    if (navigator.share) await navigator.share({ title: content.title, text: shareText });
  }

  function downloadPackage() {
    const blob = new Blob([JSON.stringify(content.exportPackage.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = content.exportPackage.metadataFileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="مركز المشاركة الاجتماعية"
        description="إعداد المحتوى المناسب للنشر بعد عرض نتيجة التقييم وملاحظات الامتثال والمخاطر، مع حزمة تصدير وتعليمات مشاركة لكل منصة."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-extrabold">{content.title}</h3>
              <p className="mt-3 leading-8 text-ink/75">{content.body}</p>
              <p className="mt-4 text-sm font-bold text-palm">{content.hashtags.join(" ")}</p>
            </div>
            <StatusBadge tone={content.readyForPublishing ? "good" : "warn"}>{content.readyForPublishing ? "مناسب للنشر" : "يتطلب مراجعة"}</StatusBadge>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={webShare} className="inline-flex items-center gap-2 rounded bg-palm px-4 py-2 text-sm font-bold text-white focus-ring">
              <Share2 size={16} />
              مشاركة
            </button>
            <button type="button" onClick={copyContent} className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold focus-ring">
              <Copy size={16} />
              نسخ
            </button>
            <button type="button" onClick={downloadPackage} className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold focus-ring">
              <Download size={16} />
              حزمة التصدير
            </button>
          </div>
        </Panel>

        <div className="grid gap-3">
          {socialPlatforms.map((platform) => {
            const shareUrl = buildShareUrl(platform.key, content);
            return (
              <Panel key={platform.key}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold">{platform.label}</h3>
                    <p className="mt-2 text-sm text-ink/60">
                      {platform.characterLimit ? `حد تقريبي: ${platform.characterLimit} حرف` : "لا يوجد حد محدد داخل المنصة."}
                    </p>
                  </div>
                  <StatusBadge tone={platform.supportsDeepLink ? "good" : "neutral"}>
                    {platform.supportsDeepLink ? "رابط مباشر" : "مشاركة يدوية"}
                  </StatusBadge>
                </div>
                {shareUrl ? (
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded bg-mint px-3 py-2 text-sm font-bold text-palm focus-ring">
                    فتح رابط المشاركة
                  </a>
                ) : null}
                <ol className="mt-4 space-y-2 text-sm leading-7 text-ink/70">
                  {platform.manualInstructions.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </Panel>
            );
          })}
        </div>
      </div>
      <div className="mt-5 rounded border border-line bg-white p-4 text-xs leading-6 text-ink/65">
        {advisoryDisclaimer}
      </div>
    </>
  );
}
