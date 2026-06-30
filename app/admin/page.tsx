import { Activity, BarChart3, ShieldAlert, Users } from "lucide-react";
import { riskDisplayLabel } from "@/lib/types";
import { BarList, CircularGauge, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminInsights } from "@/lib/services/admin-service";
import { formatDualDateTime } from "@/lib/dates";
import { AdminLoginForm } from "./login-form";
import { AdminLogoutButton } from "./logout-button";
import { ScoringProfileAdmin } from "@/components/scoring-profile-admin";
import { getScoringProfiles } from "@/lib/scoring-profiles";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = isAdminAuthenticated();

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="وصول مقيّد"
          title="لوحة الإدارة"
          description="هذه اللوحة مخصصة لإدارة المنصة فقط، وتعرض نشاط المستخدمين وتحليلات المحتوى والمخاطر. يلزم إدخال كلمة مرور المدير للوصول."
        />
        <Panel className="mx-auto max-w-md">
          <SectionTitle title="تسجيل دخول المدير" subtitle="أدخل كلمة مرور المدير للوصول إلى تحليلات الاستخدام والمخاطر." />
          <AdminLoginForm />
        </Panel>
      </div>
    );
  }

  const insights = await getAdminInsights();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="إدارة المنصة"
        title="لوحة الإدارة"
        description="نشاط المستخدمين، توزيع أنواع المحتوى، تحليل أنماط المخاطر، الاتجاهات الأسبوعية والشهرية، ورؤى حول سلوك المحامين داخل المنصة. وصول مخصص للإدارة فقط."
        action={<AdminLogoutButton />}
      />

      <KpiGrid
        items={[
          { label: "مستخدمون نشطون", value: `${insights.totals.activeUsers}`, hint: "خلال الأسبوع الحالي", tone: "good", icon: <Users size={20} /> },
          { label: "مراجعات مرصودة", value: `${insights.totals.trackedReviews}`, hint: "ضمن سجل جاهزية النشر", tone: "neutral", icon: <BarChart3 size={20} /> },
          { label: "عناصر نشاط مسجلة", value: `${insights.userActivityLog.length}`, hint: "آخر الإجراءات داخل المنصة", tone: "neutral", icon: <Activity size={20} /> }
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.6fr_1fr_1fr]">
        <Panel className="flex flex-col items-center justify-center overflow-hidden">
          <SectionTitle title="نسبة المخاطر المرتفعة" subtitle="من إجمالي المراجعات المرصودة." />
          <CircularGauge value={insights.totals.highRiskShare} tone="gold" />
        </Panel>

        <Panel className="overflow-hidden">
          <SectionTitle title="توزيع أنواع المحتوى" subtitle="عدد العناصر لكل نوع محتوى مسجل في المنصة." />
          <BarList tone="good" items={insights.contentTypeDistribution.map((item) => ({ label: item.label, value: item.value }))} />
        </Panel>

        <Panel className="overflow-hidden">
          <SectionTitle title="تحليل أنماط المخاطر" subtitle="عدد القواعد المسجلة وأبرز فئة مخاطر لكل مستوى." />
          <DataTable
            headers={["المستوى", "عدد القواعد", "أبرز فئة مخاطر"]}
            rows={insights.riskPatternAnalysis.map((item) => [
              <StatusBadge key={item.level} tone={item.level === "مرتفع" ? "gold" : item.level === "متوسط" ? "neutral" : "good"}>{riskDisplayLabel(item.level)}</StatusBadge>,
              `${item.ruleCount}`,
              item.topCategory
            ])}
          />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <SectionTitle title="الاتجاه الأسبوعي" subtitle="جاهزية النشر خلال الأسابيع الأربعة الأخيرة." />
          <BarList tone="good" items={insights.weeklyTrend} />
        </Panel>
        <Panel className="overflow-hidden">
          <SectionTitle title="الاتجاه الشهري" subtitle="جاهزية النشر خلال الأشهر الثلاثة الأخيرة." />
          <BarList tone="gold" items={insights.monthlyTrend} />
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <SectionTitle title="سجل نشاط المستخدمين" subtitle="آخر الإجراءات المسجلة داخل المنصة، بتاريخ هجري وميلادي." />
        <DataTable
          headers={["المستخدم", "الدور", "الإجراء", "التاريخ"]}
          rows={insights.userActivityLog.map((entry) => [entry.user, entry.role, entry.action, formatDualDateTime(entry.at)])}
        />
      </Panel>

      <div className="rounded-lg border border-line bg-white p-4 text-xs leading-6 text-ink/65">
        <ShieldAlert size={14} className="mb-1 inline text-gold" /> هذه اللوحة لإدارة المنصة فقط ولا تعرض بيانات تعريفية حساسة عن العملاء أو القضايا.
      </div>

      <ScoringProfileAdmin initialProfiles={getScoringProfiles()} />
    </div>
  );
}
