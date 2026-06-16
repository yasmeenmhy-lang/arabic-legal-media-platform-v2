import { PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function LoginPage() {
  return (
    <>
      <PageHeader
        title="تسجيل الدخول"
        description="واجهة جلسات مبسطة قابلة للربط لاحقاً بمزود هوية مؤسسي."
      />
      <Panel className="mx-auto max-w-lg">
        <label className="mb-3 block text-sm font-normal">
          البريد الإلكتروني
          <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" defaultValue="lawyer@example.com" />
        </label>
        <label className="mb-4 block text-sm font-normal">
          كلمة المرور
          <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" type="password" defaultValue="Demo@12345" />
        </label>
        <button className="w-full rounded bg-palm px-4 py-2 font-normal text-white focus-ring">دخول</button>
        <div className="mt-4 flex justify-between text-sm">
          <StatusBadge tone="good">محام</StatusBadge>
          <StatusBadge>مستخدم مصرح له</StatusBadge>
        </div>
      </Panel>
    </>
  );
}
