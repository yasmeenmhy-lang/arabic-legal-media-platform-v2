import type { ReviewContext, ReviewedContentContext } from "@/lib/types";

const EXCERPT_LIMIT = 120;

function normalizeForContext(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hashText(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

export function createShortExcerpt(text: string) {
  const normalized = normalizeForContext(text);
  return normalized.length > EXCERPT_LIMIT ? `${normalized.slice(0, EXCERPT_LIMIT)}...` : normalized;
}

export function createReviewedContentContext(text: string, context: ReviewContext = {}): ReviewedContentContext {
  const normalized = normalizeForContext(text);
  const contextSignature = [context.contentType, context.channel, context.audience, context.purpose].filter(Boolean).join("|");

  return {
    reviewId: `REV-${hashText(`${normalized}|${contextSignature}`)}`,
    shortExcerpt: createShortExcerpt(normalized),
    contentType: context.contentType,
    channel: context.channel,
    audience: context.audience,
    purpose: context.purpose,
    reviewedAt: new Date().toISOString()
  };
}
