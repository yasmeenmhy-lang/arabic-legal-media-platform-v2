import { BarChart3, FileCheck2, ShieldAlert, TrendingUp } from "lucide-react";
import { BarList, KpiGrid, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { isDirectorAuthenticated } from "@/lib/director-auth";
import { getAdminInsights } from "@/lib/services/admin-service";
import { DirectorLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function ManagementAnalyticsPage() {
  if (!isDirectorAuthenticated()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="وصول مقيّد" title="لوحة مدير الإدارة العامة للمحاماة" description="مؤشرات قيادية وتحليلية مجمعة لا تعرض بيانات شخصية تفصيلية ولا ترتب المستخدمين فرديًا." />
        <Panel className="mx-auto max-w-md">
          <SectionTitle title="دخول مدير الإدارة" subtitle="صلاحية مستقلة عن الأدمن والمستخدم العادي." />
          <DirectorLoginForm />
        </Panel>
      </div>
    );
  }

  const insights = await getAdminInsights();
  const tracked = insights.totals.trackedReviews;
  const avgCompliance = insights.lawyerBehavior.length
    ? Math.round(insights.lawyerBehavior.reduce((sum, item) => sum + item.avgCompliance, 0) / insights.lawyerBehavior.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المؤشرات القيادية" title="لوحة مدير الإدارة العامة للمحاماة" description="استخدام وامتثال ومخاطر واعتماد واتجاهات مجمعة مستندة إلى البيانات الفعلية المتاحة داخل المنصة." />
      <div className="grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-3">
        <label className="text-sm">الفترة الزمنية<input type="date" className="mt-2 w-full rounded border border-line px-3 py-2" /></label>
        <label className="text-sm">نوع المحتوى<select className="mt-2 w-full rounded border border-line bg-white px-3 py-2"><option>الكل</option><option>منشور</option><option>إعلان</option><option>حملة</option></select></label>
        <label className="text-sm">مستوى المخاطر<select className="mt-2 w-full rounded border border-line bg-white px-3 py-2"><option>الكل</option><option>منخفض</option><option>متوسط</option><option>مرتفع</option></select></label>
      </div>
      <KpiGrid items={[
        { label: "معدل الاستخدام", value: `${insights.totals.activeUsers}`, hint: "مستخدمون نشطون من السجل الفعلي", tone: "neutral", icon: <TrendingUp size={20} /> },
        { label: "متوسط الامتثال", value: `${avgCompliance}%`, hint: "للمراجعات المتاحة", tone: "good", icon: <FileCheck2 size={20} /> },
        { label: "متوسط المخاطر", value: `${insights.totals.highRiskShare}%`, hint: "نسبة مرتفعة المخاطر", tone: "gold", icon: <ShieldAlert size={20} /> },
        { label: "نسبة المحتوى المعتمد", value: tracked ? "محسوبة من السجل" : "0%", hint: `${tracked} مراجعة متاحة`, tone: "neutral", icon: <BarChart3 size={20} /> }
      ]} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel><SectionTitle title="اتجاهات الاستخدام" subtitle="مقارنات زمنية مجمعة دون كشف بيانات شخصية." /><BarList items={insights.weeklyTrend} tone="good" /></Panel>
        <Panel><SectionTitle title="أنماط المخاطر والملاحظات" subtitle="أكثر الفئات ارتباطًا بالمراجع المسجلة." /><BarList items={insights.riskPatternAnalysis.map((item) => ({ label: `${item.level}: ${item.topCategory}`, value: item.ruleCount }))} tone="gold" /></Panel>
      </div>
      <Panel>
        <SectionTitle title="التحليلات النوعية" subtitle="تُستنتج من النتائج الفعلية ولا تتضمن تقييمًا فرديًا للمستخدمين." />
        <ul className="grid gap-3 text-sm leading-7 md:grid-cols-2">
          <li className="rounded bg-paper p-3">أبرز أنماط الملاحظات والمخالفات المتكررة.</li>
          <li className="rounded bg-paper p-3">الموضوعات والتخصصات التي تحتاج توعية إضافية.</li>
          <li className="rounded bg-paper p-3">أنواع المحتوى والمنصات الأكثر احتياجًا إلى تعديل.</li>
          <li className="rounded bg-paper p-3">فرص تطوير الأدلة الإرشادية والاحتياجات التدريبية.</li>
        </ul>
      </Panel>
    </div>
  );
}
