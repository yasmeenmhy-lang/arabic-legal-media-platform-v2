// ─────────────────────────────────────────────────────────────────────────────
// المتحقق الحتمي من الاستشهادات بالمتن المعتمد — برمجي بالكامل، بلا أي ذكاء.
//
// إنفاذ مباشر لبند القاعدة العليا (PLATFORM_SUPREME_RULE): «يُحظر اختلاق المواد
// أو القواعد أو الاستشهادات». يقارن كل استشهاد في النص بقواعد السلوك المهني
// للمحامين أو اللائحة التنفيذية لنظام المحاماة مقابل المتن الرسمي المخزن حرفياً:
// (١) وجود المرجع المذكور فعلاً في المتن (لا «قاعدة ستون» وقواعد السلوك ٤٧ فقط)،
// (٢) مطابقة أي اقتباس حرفي منسوب لمرجع معيّن لنص ذلك المرجع المخزن.
//
// تحفّظ مقصود ضد الإنذارات الكاذبة: لا يُبلَّغ عن مشكلة إلا عند يقين المطابقة —
// ما تعذّر تفسيره بثقة يُترك لحكم القاضي الدلالي، فالمتحقق يشدد ولا يجتهد.
// ─────────────────────────────────────────────────────────────────────────────
import { OFFICIAL_CORPUS } from "@/lib/legal-official-corpus";

export type CitationIssue = {
  kind: "missing-ref" | "quote-mismatch";
  reference: string;
  document: string;
  message: string;
};

// أرقام المواد تُكتب أحياناً بالأرقام (المادة 38) — جدول تحويل الأعداد الترتيبية
// العربية المؤنثة (صيغة المتن) إلى أرقام لبناء فهرس مزدوج (اسمي ورقمي).
const UNITS: Record<string, number> = {
  "الاولي": 1, "الثانيه": 2, "الثالثه": 3, "الرابعه": 4, "الخامسه": 5,
  "السادسه": 6, "السابعه": 7, "الثامنه": 8, "التاسعه": 9, "العاشره": 10,
};
const TEEN_PREFIX: Record<string, number> = {
  "الحاديه": 1, "الثانيه": 2, "الثالثه": 3, "الرابعه": 4, "الخامسه": 5,
  "السادسه": 6, "السابعه": 7, "الثامنه": 8, "التاسعه": 9,
};
const TENS: Record<string, number> = {
  "العشرون": 20, "الثلاثون": 30, "الاربعون": 40, "الخمسون": 50,
  "الستون": 60, "السبعون": 70, "الثمانون": 80, "التسعون": 90,
};

// تطبيع شكلي يسامح فروق النسخ: تشكيل/همزات/تاء مربوطة/مسافات — نفس فلسفة
// evidenceAppearsInText في محرك الحكم.
function normalize(s: string): string {
  return s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[«»"'“”]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

// «السابعه والعشرون» ← 27؛ «العاشره» ← 10؛ «الحاديه عشره» ← 11. تعيد null عند العجز.
function ordinalToNumber(normalized: string): number | null {
  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 1) {
    if (UNITS[words[0]] !== undefined) return UNITS[words[0]];
    if (TENS[words[0]] !== undefined) return TENS[words[0]];
    return null;
  }
  if (words.length === 2 && (words[1] === "عشره" || words[1] === "عشر")) {
    const unit = TEEN_PREFIX[words[0]];
    return unit !== undefined ? 10 + unit : null;
  }
  if (words.length === 2 && words[1].startsWith("و")) {
    const tens = TENS[words[1].slice(1)];
    const unit = TEEN_PREFIX[words[0]] ?? UNITS[words[0]];
    if (tens !== undefined && unit !== undefined) return tens + unit;
    return null;
  }
  return null;
}

type DocIndex = {
  document: string;
  // بالاسم المطبّع: «القاعده السابعه والثلاثون» ← نص المادة
  byName: Map<string, string>;
  // بالرقم: 37 ← نص المادة
  byNumber: Map<number, string>;
  refWord: string; // «القاعده» أو «الماده»
};

let indexes: DocIndex[] | null = null;

function buildIndexes(): DocIndex[] {
  if (indexes) return indexes;
  const map = new Map<string, DocIndex>();
  for (const item of OFFICIAL_CORPUS) {
    let idx = map.get(item.sourceDocument);
    if (!idx) {
      idx = {
        document: item.sourceDocument,
        byName: new Map(),
        byNumber: new Map(),
        refWord: normalize(item.ref).split(" ")[0],
      };
      map.set(item.sourceDocument, idx);
    }
    const normRef = normalize(item.ref);
    idx.byName.set(normRef, item.text);
    const ordinal = normRef.split(" ").slice(1).join(" ");
    const num = ordinalToNumber(ordinal);
    if (num !== null) idx.byNumber.set(num, item.text);
  }
  indexes = [...map.values()];
  return indexes;
}

// إشارات الانتماء للوثيقتين المحكومتين — الاستشهاد بغيرهما (نظام العمل مثلاً)
// خارج نطاق هذا المتحقق ولا يُحكم عليه هنا.
const DOC_SIGNALS: Array<{ signal: string; document: string }> = [
  { signal: "قواعد السلوك المهني", document: "قواعد السلوك المهني للمحامين" },
  { signal: "اللائحه التنفيذيه لنظام المحاماه", document: "اللائحة التنفيذية لنظام المحاماة" },
];

export function verifyCorpusCitations(text: string): CitationIssue[] {
  const issues: CitationIssue[] = [];
  const docs = buildIndexes();
  const norm = normalize(text);

  // تقسيم لجمل تقريبية حتى يرتبط المرجع بوثيقته المذكورة في سياقه القريب
  const sentences = norm.split(/[.؛\n]/);

  for (const sentence of sentences) {
    const docHit = DOC_SIGNALS.find((d) => sentence.includes(d.signal));
    if (!docHit) continue;
    const idx = docs.find((d) => d.document === docHit.document);
    if (!idx) continue;

    // كل ذكر لـ«القاعده/الماده …» داخل الجملة نفسها
    const refPattern = new RegExp(`(?:القاعده|الماده)\\s+((?:[\\u0600-\\u06FF]+\\s?){1,3}|\\d{1,2})`, "g");
    let match: RegExpExecArray | null;
    while ((match = refPattern.exec(sentence)) !== null) {
      const token = match[1].trim();
      let articleText: string | undefined;
      let resolvedName = `${idx.refWord === "القاعده" ? "القاعدة" : "المادة"} ${token}`;

      if (/^\d+$/.test(token)) {
        articleText = idx.byNumber.get(Number(token));
        if (articleText === undefined && idx.byNumber.size > 0) {
          issues.push({
            kind: "missing-ref",
            reference: resolvedName,
            document: docHit.document,
            message: `الاستشهاد بـ«${resolvedName}» من ${docHit.document} لا يقابله أي مرجع في المتن الرسمي المخزن — استشهاد غير موجود.`,
          });
          continue;
        }
      } else {
        // مطابقة اسمية: جرّب الرمز كاملاً ثم بتشذيب الكلمة الأخيرة (قد تلتقط كلمة زائدة)
        const candidates = [token, token.split(" ").slice(0, 2).join(" "), token.split(" ")[0]];
        let found = false;
        let parsedAny = false;
        for (const cand of candidates) {
          const full = `${idx.refWord} ${cand}`.trim();
          if (idx.byName.has(full)) {
            articleText = idx.byName.get(full);
            resolvedName = full;
            found = true;
            break;
          }
          if (ordinalToNumber(cand) !== null) parsedAny = true;
        }
        if (!found) {
          // نبلّغ فقط إذا فُهم الرمز عدداً ترتيبياً بثقة ولم يوجد في المتن —
          // وإلا فالتحفظ: لا حكم على ما لم يُفهم (يُترك للقاضي الدلالي)
          if (parsedAny) {
            issues.push({
              kind: "missing-ref",
              reference: resolvedName,
              document: docHit.document,
              message: `الاستشهاد بـ«${resolvedName}» من ${docHit.document} لا يقابله أي مرجع في المتن الرسمي المخزن — استشهاد غير موجود.`,
            });
          }
          continue;
        }
      }

      // اقتباس حرفي منسوب في نفس الجملة؟ نتحقق من مطابقته لنص المرجع المخزن.
      // الاقتباسات في النص الأصلي بين «...» — بعد التطبيع أزيلت الأقواس، لذا
      // نلتقطها من النص الأصلي غير المطبّع ضمن نافذة الجملة.
      if (articleText) {
        const rawQuotes = extractQuotesNear(text, resolvedName);
        const normArticle = normalize(articleText);
        for (const quote of rawQuotes) {
          const nq = normalize(quote);
          if (nq.length >= 12 && !normArticle.includes(nq)) {
            issues.push({
              kind: "quote-mismatch",
              reference: resolvedName,
              document: docHit.document,
              message: `اقتباس منسوب لـ«${resolvedName}» من ${docHit.document} لا يطابق نصها الرسمي المخزن: «${quote.slice(0, 80)}…»`,
            });
          }
        }
      }
    }
  }
  return issues;
}

// يلتقط الاقتباسات «...» الواقعة في جوار ذكر المرجع (نافذة ±240 حرفاً) من النص الخام
function extractQuotesNear(rawText: string, resolvedRefName: string): string[] {
  const refKey = resolvedRefName.replace(/[ًٌٍَُِّْـ]/g, "");
  const pos = normalize(rawText).indexOf(normalize(refKey));
  if (pos < 0) return [];
  // موازاة تقريبية للموضع في النص الخام (التطبيع لا يغيّر الطول كثيراً — نافذة واسعة تكفي)
  const approxStart = Math.max(0, Math.floor(pos * 0.8) - 60);
  const windowText = rawText.slice(approxStart, approxStart + Math.floor(refKey.length * 1.4) + 560);
  const quotes: string[] = [];
  const re = /«([^»]{12,400})»/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(windowText)) !== null) quotes.push(m[1]);
  return quotes;
}
