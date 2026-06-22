import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "إدارة المحتوى الإعلامي والإعلاني للمحامين",
  description: "نافذة عربية مهنية لمراجعة المحتوى الإعلامي والإعلاني للمحامين ودعم الامتثال والمخاطر وجاهزية النشر."
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
