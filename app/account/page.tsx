import { PageHeader, Panel } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password-form";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <>
      <PageHeader title="إعدادات الحساب" description="غيّري رمز دخولك متى شئتِ — يلزم معرفة الرمز الحالي." />
      <Panel className="mx-auto max-w-lg">
        <ChangePasswordForm />
      </Panel>
    </>
  );
}
