import { BarList, PageHeader, Panel } from "@/components/ui";
import { getDashboardAnalytics } from "@/lib/services/analytics-service";

export default function AnalyticsPage() {
  const analytics = getDashboardAnalytics();
  return (
    <>
      <PageHeader
        title="المؤشرات والتقارير"
        description="مؤشرات مراجعة المحتوى والقنوات والحملات لدعم تحسين الجودة المهنية ومتابعة الامتثال والمخاطر وجاهزية النشر."
      />
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel>
          <h3 className="mb-4 font-extrabold">مؤشرات المحتوى</h3>
          <BarList items={analytics.contentPerformance} />
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">مؤشرات القنوات</h3>
          <BarList items={analytics.channelPerformance} />
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">مؤشرات التخطيط</h3>
          <BarList items={analytics.campaignPerformance} />
        </Panel>
      </div>
    </>
  );
}
