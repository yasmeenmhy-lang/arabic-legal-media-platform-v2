import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { CalendarCheck, Megaphone, MessageCircle, ShieldAlert } from "lucide-react";

const campaigns = [
  ["التوعية بالعقود", "أفراد ورواد أعمال", "لينكدإن ومنصة إكس", <StatusBadge key="ready" tone="good">جاهز للمراجعة</StatusBadge>],
  ["سرية معلومات العميل", "عملاء محتملون", "فيديو قصير", <StatusBadge key="risk" tone="warn">يتطلب ملاحظات امتثال</StatusBadge>],
  ["الإعلان المهني المنضبط", "منشآت قانونية", "منشورات متعددة", <StatusBadge key="draft" tone="neutral">مقترح تخطيطي</StatusBadge>]
];

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="دعم تخطيط الحملات"
        title="الحملات الإعلامية والإعلانية"
        description="تنظيم مقترحات الحملات والرسائل والجمهور والقنوات، مع إبقاء الامتثال والمخاطر وجاهزية النشر ضمن مسار المراجعة."
        action={<ButtonLink href="/media-planning">فتح التقويم الإعلامي</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "حملات مقترحة", value: "6", hint: "مرتبطة بموضوعات مهنية", tone: "neutral", icon: <Megaphone size={20} /> },
          { label: "رسائل مقترحة", value: "18", hint: "تحتاج مراجعة قبل الاستخدام", tone: "gold", icon: <MessageCircle size={20} /> },
          { label: "ملاحظات مخاطر", value: "4", hint: "مرتبطة بالمحتوى الإعلاني", tone: "warn", icon: <ShieldAlert size={20} /> },
          { label: "مرتبطة بالتقويم", value: "9", hint: "مواد مجدولة أو مقترحة", tone: "good", icon: <CalendarCheck size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="مقترحات الحملات" subtitle="تعرض كدعم تخطيطي، ولا تعني إطلاق الحملة أو تشغيلها آلياً." />
        <DataTable headers={["الحملة", "الجمهور المقترح", "القنوات", "الحالة"]} rows={campaigns} />
      </Panel>
    </div>
  );
}
