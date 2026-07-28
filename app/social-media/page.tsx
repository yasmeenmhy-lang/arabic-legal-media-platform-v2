"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clipboard, Download, Edit3, FileDown, Share2 } from "lucide-react";
import { Button, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons, socialBrandStyles } from "@/components/social-icons";
import { getActiveContentSelection, loadContentRecords, setActiveContentSelection, type StoredContentRecord } from "@/lib/content-record-store";
import { SavedVisualsGallery } from "@/components/saved-visuals";

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

function download(name: string, body: string, type = "application/json;charset=utf-8") {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

// pptxgenjs يُحمّل من CDN وقت الحاجة — تضمينه في الحزمة يكسر بناء Next
function loadPptxGen(): Promise<new () => any> {
  const w = window as unknown as { PptxGenJS?: new () => any };
  if (w.PptxGenJS) return Promise.resolve(w.PptxGenJS);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js";
    script.onload = () => (w.PptxGenJS ? resolve(w.PptxGenJS) : reject(new Error("PptxGenJS unavailable")));
    script.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(script);
  });
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toParagraphsHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

const exportDocStyles = `body{font-family:Arial,Tahoma,sans-serif;direction:rtl;line-height:2;color:#0D121C;padding:32px;font-size:14px}
h1{font-size:20px;color:#166A45;border-bottom:2px solid #25935F;padding-bottom:10px;margin-bottom:8px}
.meta{color:#4D5761;font-size:12px;margin-bottom:20px}
p{margin:0 0 12px}`;

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
    // إعادة التحميل عند العودة من ذاكرة المتصفح (bfcache) — التنقل بالسحب للخلف أو
    // تبديل التطبيقات في سفاري/iOS يستعيد الصفحة من ذاكرة مؤقتة أحياناً دون إعادة
    // تحميلها فعلياً، فتبقى البيانات كما كانت أول زيارة (نسخة معتمدة قديمة) ولا
    // تعكس أي اعتماد جديد حدث بعدها. إعادة القراءة عند كل ظهور تضمن بيانات حيّة دوماً.
    function loadLatest() {
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
    }
    loadLatest();
    window.addEventListener("pageshow", loadLatest);
    document.addEventListener("visibilitychange", loadLatest);
    return () => {
      window.removeEventListener("pageshow", loadLatest);
      document.removeEventListener("visibilitychange", loadLatest);
    };
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
      references: selected.version.references,
      // بقرار مالكة المنصة: المرئيات تنتقل مع المحتوى — الحزمة تشملها كاملة
      visuals: (selected.version.visuals ?? []).map((v) => ({
        visualType: v.visualType,
        visualTypeLabel: v.visualTypeLabel,
        svg: v.svg,
        imageUrl: v.imageUrl,
        createdAt: v.createdAt
      }))
    }, null, 2));
    setMessage("تم تنزيل الحزمة المعتمدة.");
  }

  function edit() {
    if (!selected) return;
    setActiveContentSelection(selected.record.id, selected.version.version);
  }

  const exportTitle = selected?.record.title ?? "المحتوى المعتمد";
  const exportMeta = selected ? `نسخة معتمدة — الإصدار ${selected.version.version}` : "نسخة معتمدة";

  // حفظ PDF: نافذة عرض نظيفة للمحتوى فقط ثم حوار الحفظ (اختر "حفظ كـ PDF")
  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) {
      setMessage("اسمح بالنوافذ المنبثقة لإتمام حفظ PDF.");
      return;
    }
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(exportTitle)}</title><style>${exportDocStyles}</style></head><body><h1>${escapeHtml(exportTitle)}</h1><div class="meta">${escapeHtml(exportMeta)}</div>${toParagraphsHtml(body)}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
    setMessage("اختر «حفظ كـ PDF» من نافذة الحفظ.");
  }

  // حفظ Word: مستند .doc قابل للتعديل بالكامل
  function exportWord() {
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>${exportDocStyles}</style></head><body><h1>${escapeHtml(exportTitle)}</h1><div class="meta">${escapeHtml(exportMeta)}</div>${toParagraphsHtml(body)}</body></html>`;
    download("المحتوى-المعتمد.doc", html, "application/msword;charset=utf-8");
    setMessage("تم تنزيل ملف Word قابل للتعديل.");
  }

  // حفظ PowerPoint: شرائح نصية قابلة للتعديل بالكامل داخل PowerPoint
  async function exportPptx() {
    try {
      const PptxGen = await loadPptxGen();
      const pptx: any = new PptxGen();
      pptx.rtlMode = true;
      pptx.defineLayout({ name: "W", width: 10, height: 7.5 });
      pptx.layout = "W";

      const cover = pptx.addSlide();
      cover.addText(exportTitle, { x: 0.6, y: 2.4, w: 8.8, h: 1.4, fontSize: 28, bold: true, align: "center", rtlMode: true, color: "166A45", fontFace: "Arial" });
      cover.addText(exportMeta, { x: 0.6, y: 3.9, w: 8.8, h: 0.6, fontSize: 14, align: "center", rtlMode: true, color: "4D5761", fontFace: "Arial" });
      cover.addShape("rect", { x: 0, y: 0, w: 10, h: 0.35, fill: { color: "25935F" } });

      const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      const chunks: string[] = [];
      let current = "";
      for (const p of paragraphs) {
        if ((current + "\n\n" + p).length > 550 && current) {
          chunks.push(current);
          current = p;
        } else {
          current = current ? `${current}\n\n${p}` : p;
        }
      }
      if (current) chunks.push(current);

      chunks.forEach((chunk) => {
        const slide = pptx.addSlide();
        slide.addShape("rect", { x: 0, y: 0, w: 10, h: 0.35, fill: { color: "25935F" } });
        slide.addText(chunk, { x: 0.6, y: 0.7, w: 8.8, h: 6.3, fontSize: 16, align: "right", valign: "top", rtlMode: true, color: "0D121C", fontFace: "Arial", lineSpacingMultiple: 1.4 });
      });

      await pptx.writeFile({ fileName: "المحتوى-المعتمد.pptx" });
      setMessage("تم تنزيل عرض PowerPoint قابل للتعديل.");
    } catch {
      setMessage("تعذر إنشاء ملف PowerPoint — حاول مرة أخرى.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المشاركة والتصدير"
        title="تجهيز مخرجات النشر المعتمدة"
      />
      <Link href="/analysis?open=1" className="inline-flex rounded-md border border-line px-4 py-2 text-sm text-palm transition hover:border-palm hover:bg-mint focus-ring">
        عودة إلى نتائج المراجعة
      </Link>

      {approvedItems.length ? (
        <>
          <Panel>
            <SectionTitle title="المحتوى المعتمد" />
            <select value={selected?.record.id} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3">
              {approvedItems.map(({ record, version }) => <option key={record.id} value={record.id}>{record.title} — الإصدار {version.version}</option>)}
            </select>
            <div className="mt-4 rounded-lg bg-paper p-4 leading-8">{body}</div>
            {/* بقرار مالكة المنصة: المرئيات المحفوظة تنتقل مع المحتوى إلى النشر — تُعرض وتُنزَّل بجانب النص */}
            <div className="mt-4">
              <SavedVisualsGallery visuals={selected?.version.visuals} title="المرئيات المرافقة للنسخة المعتمدة" withDownload />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary-gray" onClick={copy} leadingIcon={<Clipboard size={16} />}>نسخ</Button>
              <Button variant="secondary-gray" onClick={downloadPackage} leadingIcon={<Download size={16} />}>تنزيل الحزمة</Button>
              <Button variant="secondary-gray" onClick={edit} leadingIcon={<Edit3 size={16} />}>تحرير نسخة جديدة</Button>
              <Button onClick={exportPdf} leadingIcon={<FileDown size={16} />}>حفظ PDF</Button>
              <Button onClick={exportWord} leadingIcon={<FileDown size={16} />}>حفظ Word</Button>
              <Button onClick={() => void exportPptx()} leadingIcon={<FileDown size={16} />}>حفظ PowerPoint</Button>
            </div>
            {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
          </Panel>

          <Panel>
            <SectionTitle title="تجهيز القنوات" />
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
            <Link href="/analysis" className="mt-4 inline-flex rounded-md bg-palm px-4 py-2.5 text-white">فتح مراجعة المحتوى</Link>
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
