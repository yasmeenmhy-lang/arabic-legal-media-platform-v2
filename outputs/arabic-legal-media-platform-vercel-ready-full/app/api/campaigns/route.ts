import { ok } from "@/lib/api";

export async function GET() {
  return ok([
    {
      id: "campaign-1",
      name: "التوعية بالعقود",
      type: "AWARENESS",
      objective: "رفع الوعي بالمخاطر الشائعة في العقود التجارية",
      audience: "رواد الأعمال",
      channels: ["LINKEDIN", "WEBSITE"],
      status: "active"
    },
    {
      id: "campaign-2",
      name: "خدمات الشركات الناشئة",
      type: "ADVERTISING",
      objective: "تعريف الجمهور بخدمات الاستشارات التجارية",
      audience: "الشركات الناشئة",
      channels: ["X", "LINKEDIN"],
      status: "draft"
    }
  ]);
}
