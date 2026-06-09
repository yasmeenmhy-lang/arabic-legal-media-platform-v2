import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { dashboardKpis, moduleCards, alerts, recommendations } from "@/lib/data";
import { ButtonLink, KpiGrid, PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        description="ملخص عملي للمهام، المسودات، النشر، الحملات، التنبيهات، والتوصيات لتحسين الحضور الإعلامي والإعلاني."
        action={<ButtonLink href="/ai-assistant">إنشاء محتوى</ButtonLink>}
      />
      <KpiGrid items={dashboardKpis} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {moduleCards.map((card) => (
            <Link key={card.href} href={card.href} className="rounded border border-line bg-white p-5 transition hover:border-palm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-extrabold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink/60">{card.description}</p>
                </div>
                <ArrowLeft size={18} className="text-palm" />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-bold text-palm">{card.metric}</span>
                <StatusBadge tone="good">{card.status}</StatusBadge>
              </div>
            </Link>
          ))}
        </div>
        <div className="space-y-5">
          <Panel>
            <h3 className="mb-4 font-extrabold">التنبيهات</h3>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold">{alert.title}</p>
                    <StatusBadge tone={alert.severity === "HIGH" ? "danger" : "warn"}>غير مقروء</StatusBadge>
                  </div>
                  <p className="text-sm leading-6 text-ink/60">{alert.body}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-4 font-extrabold">توصيات سريعة</h3>
            <ul className="space-y-3 text-sm leading-7 text-ink/70">
              {recommendations.map((item) => (
                <li key={item} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
