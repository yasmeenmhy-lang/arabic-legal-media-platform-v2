import { BarList, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { getDashboardAnalytics } from "@/lib/services/analytics-service";

export default function AnalyticsPage() {
  const analytics = getDashboardAnalytics();
  return (
    <>
      <PageHeader eyebrow="قياس الأداء" title="التقارير والمؤشرات" description="مؤشرات مرئية لمتابعة جودة المحتوى، القنوات، التخطيط، ومخرجات المراجعة المهنية." />
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel><SectionTitle title="مؤشرات المحتوى" subtitle="توزيع نوع المحتوى محل المراجعة." /><BarList items={analytics.contentPerformance} tone="good" /></Panel>
        <Panel><SectionTitle title="مؤشرات القنوات" subtitle="القنوات الأكثر استخداماً في التخطيط." /><BarList items={analytics.channelPerformance} tone="gold" /></Panel>
        <Panel><SectionTitle title="مؤشرات التخطيط" subtitle="اتجاهات المقترحات والحملات." /><BarList items={analytics.campaignPerformance} tone="warn" /></Panel>
      </div>
    </>
  );
}
