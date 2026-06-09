import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "منصة إدارة وتمكين الحضور الإعلامي والإعلاني للمحامين",
  description: "منصة عربية لإدارة المحتوى الإعلامي والإعلاني للمحامين مع دعم الامتثال والتحليلات."
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
