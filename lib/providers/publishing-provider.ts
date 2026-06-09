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
      message: `تمت جدولة المحتوى على ${payload.channel} بشكل تجريبي.`
    };
  }
}

export function getPublishingProvider() {
  return new MockPublishingProvider();
}
