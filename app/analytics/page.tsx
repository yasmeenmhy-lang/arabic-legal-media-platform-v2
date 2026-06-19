"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileCheck2, ShieldAlert } from "lucide-react";
import { BarList, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";

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
    const payload = records.map((record) => ({
      contentId: record.id,
      status: record.status,
      approvedVersion: record.approvedVersion,
      versions: record.versions,
      actions: record.actions
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "تقرير-المحتوى-والاعتمادات.json";
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
              <button type="button" onClick={downloadReport} className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm text-white focus-ring">
                <Download size={16} /> تنزيل التقرير التفصيلي
              </button>
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
                    <div>المخاطر {current?.analysis?.riskLevel ?? "—"}</div>
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
