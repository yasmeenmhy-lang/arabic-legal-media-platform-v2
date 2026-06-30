import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── DGA كود المنصات — نظام الألوان الرسمي ─────────────────────────
        // المصدر: design.dga.gov.sa/guidelines → الألوان

        // الأخضر الأساسي (SA — اللون السعودي)
        palm:     "#25935F",   // SA 500 — الهوية الأساسية
        palmDark: "#1B8354",   // SA 600
        palmDeep: "#166A45",   // SA 700
        mint:     "#F3FCF6",   // SA 50  — خلفية فاتحة
        mintDeep: "#DFF6E7",   // SA 100

        // الذهبي الثانوي
        gold:       "#DBA102", // Gold 600
        goldDark:   "#B87B02", // Gold 700
        goldSoft:   "#FFFCE6", // Gold 100
        goldBorder: "#FCF3BD", // Gold 200

        // المحايد (رمادي)
        ink:             "#0D121C", // Gray 950 — النص الأساسي
        inkSecondary:    "#384250", // Gray 700 — النص الثانوي
        inkTertiary:     "#4D5761", // Gray 600 — النص الثالث
        warmGray:        "#6C737F", // Gray 500
        warmGrayText:    "#4D5761", // Gray 600
        warmGraySoft:    "#F3F4F6", // Gray 100
        warmGrayBorder:  "#D2D6DB", // Gray 300
        paper:           "#FCFCFD", // Gray 25  — خلفية الصفحة
        line:            "#E5E7EB", // Gray 200 — الحدود

        // الخزامى / البنفسجي (الذكاء الاصطناعي)
        violet:       "#80519F",   // Lavender 500
        violetDark:   "#6D428F",   // Lavender 600
        violetDeep:   "#532D75",   // Lavender 700
        violetSoft:   "#F9F5FA",   // Lavender 50
        violetBorder: "#E1CCE8",   // Lavender 200
        violetText:   "#532D75",   // Lavender 700

        // الدلالية — الخطأ
        errorBase:   "#F04438",    // Error 500
        errorDark:   "#D92D20",    // Error 600
        errorSoft:   "#FEF3F2",    // Error 50
        errorBorder: "#FEE4E2",    // Error 100

        // الدلالية — التحذير
        warningBase:   "#F79009",  // Warning 500
        warningDark:   "#DC6803",  // Warning 600
        warningSoft:   "#FFFAEB",  // Warning 50
        warningBorder: "#FEF0C7",  // Warning 100

        // الدلالية — المعلومات
        infoBase:   "#2E90FA",     // Info 500
        infoDark:   "#1570EF",     // Info 600
        infoSoft:   "#F5FAFF",     // Info 25
        infoBorder: "#B2DDFF",     // Info 200

        // الدلالية — النجاح
        successBase:   "#17B26A",  // Success 500
        successDark:   "#079455",  // Success 600
        successSoft:   "#ECFDF5",  // Success 50
        successBorder: "#ABEFC6",  // Success 200
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tahoma", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
