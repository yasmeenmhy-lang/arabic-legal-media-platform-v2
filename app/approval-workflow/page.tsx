import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { rbacRoles } from "@/lib/rbac";
import { FileCheck2, KeyRound, UserCog, Users } from "lucide-react";

const users = [
  ["أحمد الحربي", "محام", "مراجعة المحتوى والتصدير", <StatusBadge key="active1" tone="good">نشط</StatusBadge>],
  ["نورة القحطاني", "مشرف محتوى", "متابعة المسودات والتقويم", <StatusBadge key="active2" tone="good">نشط</StatusBadge>],
  ["سارة العتيبي", "إدارة", "الإعدادات والمصادر", <StatusBadge key="review" tone="neutral">تحديث صلاحيات</StatusBadge>]
];

const roles = rbacRoles.map((role) => [
  role.name,
  role.description,
  role.permissions.length.toLocaleString("ar-SA")
]);

export default function UserGovernancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="حوكمة المستخدمين"
        title="إدارة المستخدمين ومسارات المراجعة"
        description="متابعة الأدوار والصلاحيات ومسؤوليات مراجعة المحتوى ضمن إطار حوكمة تشغيلي واستشاري."
        action={<ButtonLink href="/administration">فتح الإعدادات</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مستخدمون نشطون", value: "3", hint: "ضمن البيئة التجريبية", tone: "good", icon: <Users size={20} /> },
          { label: "أدوار معرفة", value: `${rbacRoles.length}`, hint: "محام، مشرف، إدارة", tone: "neutral", icon: <UserCog size={20} /> },
          { label: "صلاحيات مسجلة", value: "9", hint: "مرتبطة بالخدمات", tone: "gold", icon: <KeyRound size={20} /> },
          { label: "مهام مراجعة", value: "7", hint: "قيد المتابعة", tone: "neutral", icon: <FileCheck2 size={20} /> }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle title="المستخدمون" subtitle="توزيع تشغيلي للمسؤوليات داخل المنصة." />
          <DataTable headers={["المستخدم", "الدور", "نطاق العمل", "الحالة"]} rows={users} />
        </Panel>
        <Panel>
          <SectionTitle title="الأدوار والصلاحيات" subtitle="الأدوار تضبط الوصول للخدمات ولا تحول نتائج المنصة إلى قرار رسمي." />
          <DataTable headers={["الدور", "الوصف", "عدد الصلاحيات"]} rows={roles} />
        </Panel>
      </div>
    </div>
  );
}
