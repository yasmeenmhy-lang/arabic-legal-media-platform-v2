type ProviderName = "openai" | "anthropic";

type AIProviderRequest = {
  system: string;
  user: string;
  maxTokens?: number;
};

function enhancementEnabled() {
  return process.env.AI_ENHANCEMENT_ENABLED === "true";
}

function logAIEnhancement(message: string, details: Record<string, unknown> = {}) {
  console.info("[ai-enhancement]", message, details);
}

function configuredProvider(): ProviderName | null {
  const enabled = enhancementEnabled();
  const requested = process.env.AI_ENHANCEMENT_PROVIDER;
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  logAIEnhancement("configuration-read", {
    enabled,
    requestedProvider: requested ?? "auto",
    hasOpenAIKey,
    hasAnthropicKey
  });
  if (!enabled) {
    logAIEnhancement("fallback", { reason: "AI_ENHANCEMENT_ENABLED is not true" });
    return null;
  }
  if (requested === "openai") {
    if (hasOpenAIKey) {
      logAIEnhancement("provider-selected", { provider: "openai" });
      return "openai";
    }
    logAIEnhancement("fallback", { reason: "OPENAI_API_KEY missing for openai provider" });
    return null;
  }
  if (requested === "anthropic") {
    if (hasAnthropicKey) {
      logAIEnhancement("provider-selected", { provider: "anthropic" });
      return "anthropic";
    }
    logAIEnhancement("fallback", { reason: "ANTHROPIC_API_KEY missing for anthropic provider" });
    return null;
  }
  if (requested && requested !== "auto") {
    logAIEnhancement("fallback", { reason: "unsupported AI_ENHANCEMENT_PROVIDER", requestedProvider: requested });
    return null;
  }
  if (hasOpenAIKey) {
    logAIEnhancement("provider-selected", { provider: "openai" });
    return "openai";
  }
  if (hasAnthropicKey) {
    logAIEnhancement("provider-selected", { provider: "anthropic" });
    return "anthropic";
  }
  logAIEnhancement("fallback", { reason: "no provider API key available" });
  return null;
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      logAIEnhancement("json-parse-failed", { reason: "no JSON object found in provider response" });
      return null;
    }
    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      logAIEnhancement("json-parse-failed", { reason: "provider response was not valid JSON" });
      return null;
    }
  }
}

async function requestOpenAIJson(input: AIProviderRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logAIEnhancement("fallback", { reason: "OPENAI_API_KEY missing before request" });
    return null;
  }
  logAIEnhancement("request-sent", { provider: "openai" });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user }
      ],
      max_tokens: input.maxTokens ?? 1600
    })
  });
  logAIEnhancement("provider-response", { provider: "openai", status: response.status, ok: response.ok });
  if (!response.ok) {
    logAIEnhancement("fallback", { reason: "openai response not ok", status: response.status });
    return null;
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    logAIEnhancement("fallback", { reason: "openai response missing message content" });
    return null;
  }
  return parseJsonObject(content);
}

async function requestAnthropicJson(input: AIProviderRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logAIEnhancement("fallback", { reason: "ANTHROPIC_API_KEY missing before request" });
    return null;
  }
  logAIEnhancement("request-sent", { provider: "anthropic" });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: input.maxTokens ?? 1600,
      temperature: 0.2,
      system: input.system,
      messages: [{ role: "user", content: input.user }]
    })
  });
  logAIEnhancement("provider-response", { provider: "anthropic", status: response.status, ok: response.ok });
  if (!response.ok) {
    logAIEnhancement("fallback", { reason: "anthropic response not ok", status: response.status });
    return null;
  }
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const content = data.content?.find((item) => item.type === "text")?.text;
  if (!content) {
    logAIEnhancement("fallback", { reason: "anthropic response missing text content" });
    return null;
  }
  return parseJsonObject(content);
}

export async function requestAIEnhancementJson(input: AIProviderRequest) {
  const provider = configuredProvider();
  if (!provider) return null;
  try {
    return provider === "openai"
      ? await requestOpenAIJson(input)
      : await requestAnthropicJson(input);
  } catch (error) {
    logAIEnhancement("fallback", {
      reason: "provider request threw",
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    return null;
  }
}
