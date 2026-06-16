import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ButtonLink, KpiGrid, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getDashboardOverview } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const dashboardKpis = [
    { label: "مراجعات معلقة", value: String(overview.pendingReviews), hint: "تنتظر استكمال الملاحظات" },
    { label: "محتوى مناسب للنشر", value: String(overview.publishableContent), hint: "جاهز للتصدير وفق نتائج المراجعة" },
    { label: "تصدير متوقف", value: String(overview.exportsRequiringAttention), hint: "يتطلب معالجة الملاحظات قبل النشر" },
    { label: "مخاطر عالية", value: String(overview.highRiskContent), hint: "تحتاج مراجعة مهنية إضافية" },
    { label: "إصدار المرجع", value: overview.legalReferenceVersion, hint: "آخر نسخة مرجعية مستخدمة في التقييم" },
    {
      label: "آخر فحص",
      value: overview.lastLegalSourceCheck === "غير محدد" ? "غير محدد" : new Date(overview.lastLegalSourceCheck).toLocaleDateString("ar-SA"),
      hint: "فحص مصادر وزارة العدل"
    },
    { label: "تحديثات مرجعية", value: String(overview.pendingLegalSourceUpdates), hint: "بانتظار متابعة المشرف" }
  ];

  const workflowCards = [
    {
      title: "بدء مراجعة محتوى",
      href: "/content-review",
      description: "إدخال المحتوى الإعلامي أو الإعلاني وعرض نتيجة موحدة تشمل اللغة، الامتثال، المخاطر، فرص التحسين، المراجع، وجاهزية النشر.",
      metric: `${overview.pendingReviews} مراجعات معلقة`,
      status: "المسار الرئيسي"
    },
    {
      title: "دعم التخطيط الإعلامي",
      href: "/media-planning",
      description: "تنظيم المقترحات والتوقيت والقنوات بعد الاطلاع على نتيجة المراجعة ومؤشرات المخاطر.",
      metric: "مقترحات استرشادية",
      status: "دعم"
    },
    {
      title: "المؤشرات والتقارير",
      href: "/analytics",
      description: "متابعة اتجاهات جودة المحتوى، الامتثال، المخاطر، وجاهزية النشر على مستوى المكتب أو الفريق.",
      metric: "مؤشرات تشغيلية",
      status: "قياس"
    },
    {
      title: "مركز التنبيهات",
      href: "/alerts",
      description: "متابعة المحتوى عالي المخاطر، المراجعات المتعثرة، والتنبيهات المرتبطة بالمراجع المهنية والتنظيمية.",
      metric: `${overview.highRiskContent} عالية المخاطر`,
      status: "متابعة"
    }
  ];

  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        description="ملخص تشغيلي لمنصة تمكين وإدارة المحتوى الإعلامي والإعلاني للمحامين، محسوب من سجلات المراجعة ومؤشرات الامتثال والمخاطر."
        action={<ButtonLink href="/content-review">مراجعة محتوى</ButtonLink>}
      />
      <KpiGrid items={dashboardKpis} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {workflowCards.map((card) => (
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
            <h3 className="mb-4 font-extrabold">المسار الرئيسي للتشغيل</h3>
            <p className="text-sm leading-7 text-ink/70">
              تبدأ رحلة المستخدم من مراجعة المحتوى الإعلامي والإعلاني، وتظهر ملاحظات الامتثال ومؤشرات المخاطر وفرص التحسين وجاهزية النشر والتصدير كمخرجات من نتيجة واحدة.
            </p>
          </Panel>
          <Panel>
            <h3 className="mb-4 font-extrabold">الأولوية التالية</h3>
            <p className="text-sm leading-7 text-ink/70">
              عالج المراجعات المعلقة والمحتوى عالي المخاطر قبل تجهيز أي حزمة تصدير أو مشاركة.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
