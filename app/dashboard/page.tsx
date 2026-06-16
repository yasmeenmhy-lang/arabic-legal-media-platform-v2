import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, ShieldCheck, TrendingUp } from "lucide-react";
import { BarList, ButtonLink, KpiGrid, PageHeader, Panel, ProgressBar, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardOverview } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const readinessRate = 76;
  const complianceRate = 88;
  const qualityRate = 91;
  const riskRate = 18;

  const dashboardKpis = [
    { label: "مراجعات معلقة", value: String(overview.pendingReviews), hint: "محتوى ينتظر استكمال الملاحظات", tone: "warn" as const, icon: <Clock3 size={19} /> },
    { label: "مناسب للنشر", value: String(overview.publishableContent), hint: "جاهز للتصدير وفق نتائج المراجعة", tone: "good" as const, icon: <CheckCircle2 size={19} /> },
    { label: "تصدير متوقف", value: String(overview.exportsRequiringAttention), hint: "يتطلب معالجة قبل المشاركة", tone: "danger" as const, icon: <AlertTriangle size={19} /> },
    { label: "مخاطر عالية", value: String(overview.highRiskContent), hint: "تحتاج متابعة مهنية عاجلة", tone: "danger" as const, icon: <ShieldCheck size={19} /> }
  ];

  const recentActivity = [
    ["إعلان خدمات للشركات الناشئة", "يتطلب معالجة الملاحظات", "عال", "قبل 18 دقيقة"],
    ["منشور توعوي عن العقود", "مناسب للنشر", "منخفض", "قبل ساعة"],
    ["نص فيديو قصير", "تتطلب مراجعة", "متوسط", "اليوم"]
  ];

  return (
    <>
      <PageHeader
        eyebrow="مركز القيادة التشغيلي"
        title="لوحة التحكم"
        description="نظرة تنفيذية على جودة المحتوى الإعلامي والإعلاني، ملاحظات الامتثال، مؤشرات المخاطر، وجاهزية النشر."
        action={<ButtonLink href="/content-review">بدء مراجعة محتوى</ButtonLink>}
      />

      <KpiGrid items={dashboardKpis} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle title="ملخص الجاهزية" subtitle="مؤشرات مرئية تساعد على فهم الحالة خلال ثوان." />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-900">جاهزية النشر</span>
                <span className="text-3xl font-extrabold text-emerald-800">{readinessRate}%</span>
              </div>
              <div className="mt-4"><ProgressBar value={readinessRate} tone="good" /></div>
              <p className="mt-3 text-xs leading-6 text-ink/60">النسبة الإجمالية للمحتوى المناسب للتصدير بعد المراجعة.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-900">مؤشر المخاطر</span>
                <span className="text-3xl font-extrabold text-amber-800">{riskRate}%</span>
              </div>
              <div className="mt-4"><ProgressBar value={riskRate} tone="warn" /></div>
              <p className="mt-3 text-xs leading-6 text-ink/60">نسبة العناصر التي تحتاج متابعة بسبب مخاطر مهنية أو تنظيمية.</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-ink">مستوى الامتثال</span>
                <span className="text-3xl font-extrabold text-palm">{complianceRate}%</span>
              </div>
              <div className="mt-4"><ProgressBar value={complianceRate} tone="good" /></div>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-ink">جودة المحتوى</span>
                <span className="text-3xl font-extrabold text-gold">{qualityRate}%</span>
              </div>
              <div className="mt-4"><ProgressBar value={qualityRate} tone="gold" /></div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="ملخص تنفيذي" subtitle="أولوية اليوم بناء على حالة المراجعات." />
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-red-800">
              <AlertTriangle size={18} />
              <p className="font-extrabold">أولوية عالية</p>
            </div>
            <p className="text-sm leading-7 text-ink/75">توجد عناصر عالية المخاطر وتصدير متوقف. يوصى بمعالجة ملاحظات الامتثال والمخاطر قبل أي مشاركة خارجية.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line p-3">
              <p className="text-xs text-ink/55">آخر فحص للمراجع</p>
              <p className="mt-1 font-extrabold">{overview.lastLegalSourceCheck === "غير محدد" ? "غير محدد" : new Date(overview.lastLegalSourceCheck).toLocaleDateString("ar-SA")}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-xs text-ink/55">تحديثات مرجعية</p>
              <p className="mt-1 font-extrabold">{overview.pendingLegalSourceUpdates}</p>
            </div>
          </div>
          <Link href="/content-review" className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-extrabold text-white focus-ring">
            <FileCheck2 size={16} />
            الانتقال إلى المراجعة
          </Link>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Panel>
          <SectionTitle title="اتجاهات آخر فترة" subtitle="مؤشرات مختصرة لمتابعة التحسن." />
          <BarList
            items={[
              { label: "تحسن جودة الصياغة", value: 91 },
              { label: "انخفاض الملاحظات العالية", value: 64 },
              { label: "جاهزية التصدير", value: 76 }
            ]}
            tone="good"
          />
        </Panel>
        <Panel>
          <SectionTitle title="تنبيهات مهنية" subtitle="عناصر تحتاج متابعة." />
          <div className="space-y-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <StatusBadge tone="danger">مخاطر عالية</StatusBadge>
              <p className="mt-2 text-sm font-bold">إعلان يتضمن وعداً بنتيجة مضمونة.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <StatusBadge tone="warn">مراجعة مطلوبة</StatusBadge>
              <p className="mt-2 text-sm font-bold">صياغة تحتاج توضيحاً قبل النشر.</p>
            </div>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="النشاط الأخير" subtitle="آخر عناصر المراجعة." />
          <div className="space-y-3">
            {recentActivity.map(([title, status, risk, time]) => (
              <div key={title} className="rounded-lg border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-extrabold leading-6">{title}</p>
                  <StatusBadge tone={risk === "عال" ? "danger" : risk === "متوسط" ? "warn" : "good"}>{risk}</StatusBadge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink/55">
                  <span>{status}</span>
                  <span>{time}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
