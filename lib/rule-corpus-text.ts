// ─────────────────────────────────────────────────────────────────────────────
// المتن الرسمي الكامل نصّاً — مصدر واحد يقرأ منه القاضي والكاتب معاً.
//
// ★ بقرار مالكة المنصة، بعد أن تكرّر السؤال: «ليش يكتب نص مخالف من الأساس؟»
// الجواب أن الكاتب لم يكن يرى القواعد إطلاقاً — مطالبته خالية من المتن، بينما
// محرّك الحكم يتلقّى المتن الرسمي كاملاً (٤٧ قاعدة سلوك + ٩٠ مادة لائحة).
// فيكتب وهو يجهل بماذا سيُحاكَم، ثم يُحكم عليه بما لم يره، فيُعاد ويُعاد ثم
// يُرفض. والأدهى أن مطالبته تأمره بتأصيل كل حكم «باسم النظام ورقم المادة» وهو
// لا يملك المتن، فيأتي بالرقم من ذاكرته.
//
// فصار المتن يدخل مطالبة الكاتب كما يدخل مطالبة القاضي: يكتب وهو يعرف الحدّ.
// وهو مخزَّن في المنصة أصلاً — لا يحتاج بحثاً ولا مكالمة ولا زمناً إضافياً،
// ويُرسل في كتلة system المخزّنة مؤقتاً لدى المزود فلا يُعاد ترميزه كل طلب.
//
// ★ المتن يُقرأ ولا يُكتب فيه حرف.
// ─────────────────────────────────────────────────────────────────────────────
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import { OFFICIAL_CORPUS } from "@/lib/legal-official-corpus";

// النص الحرفي المنقول من منصة تشريعات وزارة العدل لكل قاعدة سلوك ولكل مادة من
// اللائحة التنفيذية — ليحكم الذكاء ويكتب من المادة نفسها ومقصدها، لا من ملخص
// أو عنوان. مناطق الرصد بالمعنى تُلحق من قاعدة المعرفة حيث توجد إشارات مطابقة.
export function buildOfficialRuleCorpusText(): string {
  const hintsByRef = new Map<string, string>();
  for (const entry of legalKnowledgeEntries) {
    if (!entry.legalReference || !entry.riskCategories?.length) continue;
    const baseRef = entry.legalReference.split("،")[0].trim();
    const existing = hintsByRef.get(baseRef);
    const hint = entry.riskCategories.join("، ");
    hintsByRef.set(baseRef, existing ? `${existing}، ${hint}` : hint);
  }

  const blocks: string[] = [];
  let lastSource = "";
  let lastChapter = "";
  for (const item of OFFICIAL_CORPUS) {
    if (item.sourceDocument !== lastSource) {
      blocks.push(`\n# ${item.sourceDocument}`);
      lastSource = item.sourceDocument;
      lastChapter = "";
    }
    if (item.chapter && item.chapter !== lastChapter) {
      blocks.push(`## ${item.chapter}`);
      lastChapter = item.chapter;
    }
    const hints = hintsByRef.get(item.ref);
    const areas = hints
      ? `\nمناطق الرصد بالمعنى (بأي صياغة، لا تحصر نفسك بألفاظ بعينها): ${hints}`
      : "";
    blocks.push(`### ${item.ref}${item.section ? ` — ${item.section}` : ""}\n${item.text}${areas}`);
  }
  return blocks.join("\n\n");
}
