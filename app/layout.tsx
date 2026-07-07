import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "إدارة المحتوى الإعلامي والإعلاني للمحامين",
  description: "نافذة عربية مهنية لمراجعة المحتوى الإعلامي والإعلاني للمحامين ودعم الامتثال والمخاطر وجاهزية النشر."
};

// ختم النسخة — يُحسب وقت البناء، ليعرف المستخدم أي نشرة يشاهد (كشف النسخ العالقة)
const BUILD_SHA = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "محلي";
const BUILD_TIME = new Date(Date.now() + 3 * 3600 * 1000) // توقيت الرياض (UTC+3)
  .toISOString()
  .slice(0, 16)
  .replace("T", " ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        <div
          dir="ltr"
          style={{
            position: "fixed",
            bottom: 4,
            left: 6,
            zIndex: 50,
            fontSize: "10px",
            lineHeight: 1,
            color: "#9AA4B2",
            opacity: 0.55,
            pointerEvents: "none",
            fontFamily: "monospace",
          }}
          title="نسخة النشر — رمز الإصدار ووقت البناء"
        >
          v·{BUILD_SHA} · {BUILD_TIME}
        </div>
      </body>
    </html>
  );
}
