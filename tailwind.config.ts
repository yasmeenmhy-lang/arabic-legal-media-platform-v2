import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    // ── DGA كود المنصات — نقاط التوقف الرسمية ─────────────────────────
    screens: {
      'sm':  '600px',   // صغيرة؛ جوال → لوحي
      'md':  '960px',   // متوسطة؛ لوحي → مكتب
      'lg':  '1280px',  // كبيرة؛ سطح المكتب
      'xl':  '1440px',  // X كبيرة؛ سطح المكتب
      '2xl': '1920px',  // width-6xl
    },
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
      },
      // ── DGA كود المنصات — العرض الرسمي ─────────────────────────────
      maxWidth: {
        'width-xxs': '320px',
        'width-xs':  '384px',
        'width-sm':  '480px',
        'width-md':  '560px',
        'width-lg':  '640px',
        'width-xl':  '768px',
        'width-2xl': '1024px',
        'width-3xl': '1280px',  // container-max-width-desktop
        'width-4xl': '1440px',
        'width-5xl': '1600px',
        'width-6xl': '1920px',
        'paragraph': '720px',   // paragraph-max-width
      },
      boxShadow: {
        // ── DGA كود المنصات — نظام الظلال الرسمي ─────────────────────────
        // اللون الموحد: #101828 — design.dga.gov.sa/guidelines → الظلال
        'xs':  '0 1px 2px 0 rgba(16,24,40,0.05)',
        'sm':  '0 1px 3px 0 rgba(16,24,40,0.10)',
        'md':  '0 1px 2px 0 rgba(16,24,40,0.06), 0 4px 8px -2px rgba(16,24,40,0.10)',
        'lg':  '0 2px 4px -2px rgba(16,24,40,0.06), 0 12px 16px -6px rgba(16,24,40,0.08)',
        'xl':  '0 4px 6px -2px rgba(16,24,40,0.03), 0 20px 24px -4px rgba(16,24,40,0.08)',
        '2xl': '0 8px 8px -4px rgba(16,24,40,0.03), 0 24px 48px -12px rgba(16,24,40,0.18)',
        '3xl': '0 32px 64px -12px rgba(16,24,40,0.14)',
        'none': 'none',
      }
    }
  },
  plugins: []
};

export default config;
