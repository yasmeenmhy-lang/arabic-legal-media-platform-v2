import { ok } from "@/lib/api";

export async function GET() {
  return ok([
    {
      id: "template-1",
      name: "قالب منشور توعوي",
      category: "AWARENESS",
      tags: ["توعية", "امتثال"],
      isArchived: false
    },
    {
      id: "template-2",
      name: "قالب حملة مهنية",
      category: "PROFESSIONAL",
      tags: ["حملة", "محتوى مهني"],
      isArchived: false
    }
  ]);
}
