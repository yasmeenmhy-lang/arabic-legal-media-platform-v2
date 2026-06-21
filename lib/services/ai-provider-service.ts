type ProviderName = "openai" | "anthropic";

type AIProviderRequest = {
  system: string;
  user: string;
  maxTokens?: number;
};

function enhancementEnabled() {
  return process.env.AI_ENHANCEMENT_ENABLED === "true";
}

function configuredProvider(): ProviderName | null {
  if (!enhancementEnabled()) return null;
  const requested = process.env.AI_ENHANCEMENT_PROVIDER;
  if (requested === "openai") return process.env.OPENAI_API_KEY ? "openai" : null;
  if (requested === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}

async function requestOpenAIJson(input: AIProviderRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
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
  if (!response.ok) return null;
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  return content ? parseJsonObject(content) : null;
}

async function requestAnthropicJson(input: AIProviderRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
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
  if (!response.ok) return null;
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const content = data.content?.find((item) => item.type === "text")?.text;
  return content ? parseJsonObject(content) : null;
}

export async function requestAIEnhancementJson(input: AIProviderRequest) {
  const provider = configuredProvider();
  if (!provider) return null;
  try {
    return provider === "openai"
      ? await requestOpenAIJson(input)
      : await requestAnthropicJson(input);
  } catch {
    return null;
  }
}
