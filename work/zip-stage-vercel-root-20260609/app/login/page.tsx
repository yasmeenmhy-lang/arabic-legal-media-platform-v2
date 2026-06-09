import { PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function LoginPage() {
  return (
    <>
      <PageHeader title="تسجيل الدخول" description="واجهة تجريبية للجلسات. يمكن ربطها لاحقا بمزود مصادقة مؤسسي أو NextAuth." />
      <Panel className="mx-auto max-w-lg">
        <label className="mb-3 block text-sm font-bold">
          البريد الإلكتروني
          <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" defaultValue="lawyer@example.com" />
        </label>
        <label className="mb-4 block text-sm font-bold">
          كلمة المرور
          <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" type="password" defaultValue="Demo@12345" />
        </label>
        <button className="w-full rounded bg-palm px-4 py-2 font-bold text-white focus-ring">دخول</button>
        <div className="mt-4 flex justify-between text-sm">
          <StatusBadge tone="good">محام</StatusBadge>
          <StatusBadge>مشرف</StatusBadge>
          <StatusBadge>مدير النظام</StatusBadge>
        </div>
      </Panel>
    </>
  );
}
