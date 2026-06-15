export type PublishPayload = {
  contentId: string;
  channel: string;
  body: string;
  publishAt: string;
};

export type PublishResult = {
  provider: string;
  status: "scheduled" | "failed";
  externalId?: string;
  message: string;
  languageQualityScore?: number;
};

export interface PublishingProvider {
  name: string;
  schedule(payload: PublishPayload): Promise<PublishResult>;
}

export class MockPublishingProvider implements PublishingProvider {
  name = "mock";

  async schedule(payload: PublishPayload): Promise<PublishResult> {
    return {
      provider: this.name,
      status: "scheduled",
      externalId: `mock-${payload.contentId}-${Date.now()}`,
      message: `تمت إضافة المحتوى إلى متابعة النشر على ${payload.channel} وفق نتائج المراجعة.`
    };
  }
}

export function getPublishingProvider() {
  return new MockPublishingProvider();
}
