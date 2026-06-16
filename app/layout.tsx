import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "منصة تمكين وإدارة المحتوى الإعلامي والإعلاني للمحامين",
  description: "منصة عربية مهنية لمراجعة المحتوى الإعلامي والإعلاني للمحامين ودعم الامتثال والمخاطر وجاهزية النشر."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
