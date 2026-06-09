import { BarList, PageHeader, Panel } from "@/components/ui";
import { getDashboardAnalytics } from "@/lib/services/analytics-service";

export default function AnalyticsPage() {
  const analytics = getDashboardAnalytics();
  return (
    <>
      <PageHeader title="التحليلات" description="مؤشرات أداء المحتوى والقنوات والحملات مع فلاتر وتصدير قابل للتطوير." />
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel>
          <h3 className="mb-4 font-extrabold">أداء المحتوى</h3>
          <BarList items={analytics.contentPerformance} />
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">أداء القنوات</h3>
          <BarList items={analytics.channelPerformance} />
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">أداء الحملات</h3>
          <BarList items={analytics.campaignPerformance} />
        </Panel>
      </div>
    </>
  );
}
