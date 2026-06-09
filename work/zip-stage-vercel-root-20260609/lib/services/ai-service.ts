import type { AIContentInput, AIContentOutput } from "@/lib/types";

export interface AIService {
  generateContent(input: AIContentInput): Promise<AIContentOutput>;
}

export class MockAIService implements AIService {
  async generateContent(input: AIContentInput): Promise<AIContentOutput> {
    const base = `محتوى ${input.objective} موجه إلى ${input.audience} حول ${input.topic} في مجال ${input.practiceArea}، مناسب لقناة ${input.channel}.`;

    return {
      versions: [
        `${base} يركز على التوعية بلغة واضحة ويبتعد عن الوعود أو المبالغة.`,
        `${base} بصياغة مهنية مختصرة تدعو القارئ إلى طلب استشارة لفهم حالته الخاصة.`,
        `${base} قابل للتحويل إلى منشور قصير أو مقال تفصيلي حسب خطة النشر.`
      ],
      titles: [
        `ما الذي يجب معرفته عن ${input.topic}؟`,
        `${input.topic}: نقاط عملية قبل اتخاذ القرار`,
        `دليل موجز حول ${input.topic}`
      ],
      hashtags: ["#توعية_قانونية", "#محاماة", "#امتثال_مهني"],
      cta: "تواصل مع محام مرخص لفهم الخيارات المناسبة لحالتك."
    };
  }
}

export function getAIService(): AIService {
  return new MockAIService();
}
