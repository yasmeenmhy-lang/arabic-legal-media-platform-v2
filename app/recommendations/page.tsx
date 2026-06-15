import { getRecommendations } from "@/lib/services/recommendation-service";
import { PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function RecommendationsPage() {
  return (
    <>
      <PageHeader title="فرص التحسين" description="مقترحات مهنية لتحسين المحتوى، اختيار القنوات، اتجاهات الحملات، توقيت النشر، وجودة المراجعة." />
      <div className="grid gap-4 md:grid-cols-3">
        {getRecommendations().map((item) => (
          <Panel key={item.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-extrabold">{item.title}</h3>
              <StatusBadge tone="good">أولوية {item.priority}</StatusBadge>
            </div>
            <p className="text-sm leading-7 text-ink/65">{item.body}</p>
          </Panel>
        ))}
      </div>
    </>
  );
}
