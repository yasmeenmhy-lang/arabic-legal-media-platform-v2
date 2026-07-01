"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Download, FileCheck2, ShieldAlert } from "lucide-react";
import { BarList, Button, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";
import { riskDisplayLabel, type RiskLevel } from "@/lib/types";

export default function AnalyticsPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  useEffect(() => setRecords(loadContentRecords()), []);

  const versions = useMemo(() => records.flatMap((record) => record.versions.map((version) => ({ record, version }))), [records]);
  const analyzed = versions.filter((item) => item.version.analysis);
  const approved = versions.filter((item) => item.version.approvedAt);
  const avgCompliance = analyzed.length ? Math.round(analyzed.reduce((sum, item) => sum + (item.version.analysis?.complianceScore ?? 0), 0) / analyzed.length) : 0;
  const highRisk = analyzed.filter((item) => item.version.analysis?.riskLevel === "مرتفع").length;
  const actionCount = records.reduce((sum, item) => sum + item.actions.length, 0);

  function downloadReport() {
    const generatedAt = new Date().toLocaleString("ar-SA");
    const rows = records.map((record) => {
      const current = record.versions.find((item) => item.version === record.currentVersion);
      const approvedVersion = record.approvedVersion
        ? record.versions.find((item) => item.version === record.approvedVersion)
        : undefined;
      const analysis = approvedVersion?.analysis ?? current?.analysis;
      const findings = analysis?.findings ?? [];
      const references = approvedVersion?.references ?? current?.references ?? [];

      return `
        <section class="record">
          <h2>${record.title}</h2>
          <dl>
            <div><dt>حالة المحتوى</dt><dd>${record.status}</dd></div>
            <div><dt>النسخة المعتمدة</dt><dd>${record.approvedVersion ? `الإصدار ${record.approvedVersion}` : "لا توجد نسخة معتمدة"}</dd></div>
            <div><dt>قرار النشر</dt><dd>${analysis?.publicationDecision.label ?? "لم يتم تحليل المحتوى بعد"}</dd></div>
            <div><dt>جاهزية النشر</dt><dd>${analysis?.readinessDecision.level ?? "غير متاحة"}</dd></div>
          </dl>
          <div class="metrics">
            <p><strong>الامتثال:</strong> ${analysis ? `${analysis.complianceScore}%` : "غير متاح"}</p>
            <p><strong>المخاطر:</strong> ${analysis ? `${riskDisplayLabel(analysis.riskLevel as RiskLevel)} (${analysis.riskScore}%)` : "غير متاح"}</p>
            <p><strong>جودة اللغة:</strong> ${analysis ? `${analysis.languageQuality.score}%` : "غير متاح"}</p>
          </div>
          <h3>أبرز الملاحظات والإجراءات</h3>
          ${
            findings.length
              ? `<ul>${findings.slice(0, 6).map((finding) => `<li><strong>${finding.title}</strong><br/>الدليل: ${finding.evidence}<br/>الإجراء المقترح: ${finding.suggestedSaferWording}</li>`).join("")}</ul>`
              : "<p>لا توجد ملاحظات مهنية ظاهرة في النسخة الحالية.</p>"
          }
          <h3>المراجع المهنية والرسمية</h3>
          ${
            references.length
              ? `<ul>${references.slice(0, 6).map((reference) => `<li><strong>${reference.referenceName}</strong><br/>${reference.articleOrRuleNumber}<br/>سبب الاستناد: ${reference.relianceReason}</li>`).join("")}</ul>`
              : "<p>لا توجد مراجع مرتبطة بهذه النسخة.</p>"
          }
        </section>
      `;
    }).join("");
    const html = `<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>التقرير التفصيلي للمحتوى والاعتمادات</title>
          <style>
            body{font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;line-height:1.8;color:#1f2933;margin:32px;background:#fff}
            h1{font-size:22px;margin-bottom:4px} h2{font-size:18px;margin-top:0} h3{font-size:15px;margin:18px 0 8px}
            .meta{color:#52605a;margin-bottom:24px}.record{border:1px solid #d8e0dc;border-radius:14px;padding:18px;margin-bottom:16px}
            dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}dt{font-size:12px;color:#66756f}dd{margin:0;font-weight:600}
            .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;background:#f4f7f6;padding:12px;border-radius:10px}
            li{margin-bottom:10px}
          </style>
        </head>
        <body>
          <h1>التقرير التفصيلي للمحتوى والاعتمادات</h1>
          <p class="meta">تقرير مقروء ومنظم للمستخدم النهائي — تاريخ الإنشاء: ${generatedAt}</p>
          ${rows || "<p>لا توجد سجلات محتوى محفوظة لإعداد التقرير.</p>"}
        </body>
      </html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "التقرير-التفصيلي-للمحتوى-والاعتمادات.html";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="قياس الأداء"
        title="التقارير والمؤشرات"
        description="تعرض التقارير المؤشرات المحسوبة من مراجعات فعلية محفوظة فقط."
      />
      <Link href="/dashboard" className="inline-flex rounded-md border border-line px-4 py-2 text-sm text-palm transition hover:border-palm hover:bg-mint focus-ring">
        عودة إلى لوحة التحكم
      </Link>

      <KpiGrid items={[
        { label: "المحتويات", value: `${records.length}`, hint: "مواد مستقلة محفوظة في السجل لاتخاذ قرار المتابعة", tone: "neutral", icon: <BarChart3 size={20} /> },
        { label: "الإصدارات المحللة", value: `${analyzed.length}`, hint: "مرتبطة بنتائج تحليل فعلية", tone: "neutral", icon: <FileCheck2 size={20} /> },
        { label: "الإصدارات المعتمدة", value: `${approved.length}`, hint: "محفوظة مع التحليل والمراجع", tone: "good", icon: <FileCheck2 size={20} /> },
        { label: "مرتفعة المخاطر", value: `${highRisk}`, hint: "من الإصدارات المحللة", tone: highRisk ? "gold" : "good", icon: <ShieldAlert size={20} /> }
      ]} />

      {records.length ? (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionTitle title="ملخص التحليل والاعتماد" subtitle="متطابق مع سجل المحتوى والإصدارات المحفوظة." />
              <BarList items={[
                { label: "متوسط الامتثال", value: avgCompliance },
                { label: "نسبة المحتوى المعتمد", value: analyzed.length ? Math.round((approved.length / analyzed.length) * 100) : 0 },
                { label: "نسبة المخاطر غير المرتفعة", value: analyzed.length ? Math.round(((analyzed.length - highRisk) / analyzed.length) * 100) : 0 }
              ]} tone="good" />
            </Panel>
            <Panel>
              <SectionTitle title="التحركات والتغييرات" subtitle="كل تعديل وتحليل واعتماد ومشاركة مسجل باسم المستخدم والتاريخ والحالة." />
              <p className="text-3xl font-normal text-palm">{actionCount}</p>
              <Button onClick={downloadReport} className="mt-4" leadingIcon={<Download size={16} />}>
                تنزيل التقرير التفصيلي
              </Button>
            </Panel>
          </div>

          <Panel>
            <SectionTitle title="حالة المحتوى" subtitle="النتيجة والحالة والاعتماد والمراجع من نفس معرف المحتوى والإصدار." />
            <div className="space-y-3">
              {records.map((record) => {
                const current = record.versions.find((item) => item.version === record.currentVersion);
                return (
                  <div key={record.id} className="grid gap-3 rounded-lg border border-line p-4 text-sm md:grid-cols-6">
                    <div className="md:col-span-2"><p className="font-normal">{record.title}</p><p className="text-xs text-ink/55">المادة الحالية في سجل المحتوى</p></div>
                    <div>الإصدار {record.currentVersion}</div>
                    <div>الامتثال {current?.analysis?.complianceScore ?? "—"}</div>
                    <div>المخاطر {riskDisplayLabel(current?.analysis?.riskLevel as RiskLevel)}</div>
                    <StatusBadge tone={record.approvedVersion ? "good" : "neutral"}>{record.approvedVersion ? `معتمد — الإصدار ${record.approvedVersion}` : record.status}</StatusBadge>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      ) : (
        <Panel className="text-center">
          <BarChart3 className="mx-auto text-palm" size={34} />
          <SectionTitle title="لا توجد مؤشرات محفوظة" subtitle="ستظهر مؤشرات المحتوى والقنوات والمخاطر بعد توفر مراجعات فعلية أو سجلات نشر مرتبطة بنتائج مراجعة." />
        </Panel>
      )}
    </div>
  );
}
