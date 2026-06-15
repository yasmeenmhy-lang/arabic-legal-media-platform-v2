import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ButtonLink, KpiGrid, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getDashboardOverview } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const dashboardKpis = [
    { label: "مراجعات معلقة", value: String(overview.pendingReviews), hint: "تنتظر قرار المراجع" },
    { label: "محتوى معتمد", value: String(overview.approvedContent), hint: "جاهز للتصدير أو المشاركة" },
    { label: "تصدير محظور", value: String(overview.blockedExports), hint: "يتطلب تصحيحا قبل النشر" },
    { label: "مخاطر عالية", value: String(overview.highRiskContent), hint: "تحتاج مراجعة قانونية" },
    { label: "إصدار المرجع", value: overview.legalReferenceVersion, hint: "آخر نسخة قانونية معتمدة" },
    {
      label: "آخر فحص",
      value: overview.lastLegalSourceCheck === "غير محدد" ? "غير محدد" : new Date(overview.lastLegalSourceCheck).toLocaleDateString("ar-SA"),
      hint: "فحص مصادر وزارة العدل"
    },
    { label: "تحديثات قانونية", value: String(overview.pendingLegalSourceUpdates), hint: "بانتظار اعتماد المشرف" }
  ];

  const moduleCards = [
    { title: "مراجعة المحتوى", href: "/content-review", description: "جودة اللغة، الامتثال، المخاطر، الاعتماد، ومنع التصدير غير المعتمد.", metric: `${overview.pendingReviews} معلقة`, status: "متابعة" },
    { title: "قاعدة المعرفة القانونية", href: "/library", description: "مصادر وزارة العدل، قواعد السلوك المهني، واللائحة التنفيذية مع سجل التحديثات.", metric: `${overview.pendingLegalSourceUpdates} تحديث`, status: "مراقبة" },
    { title: "مسار الاعتماد", href: "/approval-workflow", description: "إدارة الحالات من المسودة حتى المشاركة مع سجل واضح للقرارات.", metric: `${overview.approvedContent} معتمد`, status: "نشط" },
    { title: "مركز المشاركة الاجتماعية", href: "/social-media", description: "حزم تصدير ومشاركة يدوية أو مباشرة للمنصات الاجتماعية.", metric: "6 منصات", status: "جاهز" }
  ];

  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        description="ملخص تشغيلي محسوب من سجلات سير العمل والمراجعات ومصادر وزارة العدل."
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
            <h3 className="mb-4 font-extrabold">حالة الإنتاج</h3>
            <p className="text-sm leading-7 text-ink/70">
              جميع الأرقام في هذه اللوحة محسوبة من سجلات المحتوى والمراجعات ومصادر المعرفة القانونية في قاعدة البيانات.
            </p>
          </Panel>
          <Panel>
            <h3 className="mb-4 font-extrabold">الأولوية التالية</h3>
            <p className="text-sm leading-7 text-ink/70">
              راجع التحديثات القانونية المعلقة والمحتوى عالي المخاطر قبل السماح بأي تصدير أو مشاركة.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
