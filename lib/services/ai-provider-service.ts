import { recordUsage } from "@/lib/cost-meter";

type ProviderName = "openai" | "anthropic";

type AIProviderRequest = {
  system: string;
  user: string;
  maxTokens?: number;
};

export type AIProviderDiagnosticResult = {
  runtime: {
    enabled: boolean;
    providerSetting: string;
    hasOpenAIKey: boolean;
    hasAnthropicKey: boolean;
  };
  provider: {
    selected: ProviderName | null;
    requestAttempted: boolean;
    responseStatus: number | null;
    responseOk: boolean | null;
  };
  parsing: {
    jsonParsed: boolean;
  };
  fallback: {
    used: boolean;
    reason: string | null;
  };
  rawPayload?: unknown;
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
  // التوحيد على Sonnet: في الوضع التلقائي يُفضَّل Anthropic (Claude Sonnet) دائماً
  // ليكون دماغ المنصة واحداً، وOpenAI فقط بديل احتياطي عند غياب مفتاح Anthropic.
  if (hasAnthropicKey) {
    logAIEnhancement("provider-selected", { provider: "anthropic" });
    return "anthropic";
  }
  if (hasOpenAIKey) {
    logAIEnhancement("provider-selected", { provider: "openai" });
    return "openai";
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
      model: "claude-sonnet-5",
      max_tokens: input.maxTokens ?? 1600,
      // النماذج بعد Opus 4.6 (ومنها Sonnet 5) ترفض أي حرارة غير 1.0 بخطأ 400 — لا تُضبط
      thinking: { type: "disabled" },
      // تخزين مؤقت للموجّه الثابت — يخفض تكلفة مدخلاته على النداءات المتقاربة
      system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input.user }]
    })
  });
  logAIEnhancement("provider-response", { provider: "anthropic", status: response.status, ok: response.ok });
  if (!response.ok) {
    logAIEnhancement("fallback", { reason: "anthropic response not ok", status: response.status });
    return null;
  }
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }>; usage?: unknown };
  recordUsage(data.usage, { stage: "تحسين التقرير", model: "claude-sonnet-5" }); // عدّاد التكلفة الداخلي
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

function safeParseJsonObject(value: string) {
  try {
    return { parsed: true, value: JSON.parse(value) as unknown };
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return { parsed: false, value: null };
    try {
      return { parsed: true, value: JSON.parse(match[0]) as unknown };
    } catch {
      return { parsed: false, value: null };
    }
  }
}

function resolveDiagnosticProvider() {
  const enabled = enhancementEnabled();
  const providerSetting = process.env.AI_ENHANCEMENT_PROVIDER ?? "auto";
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  let selected: ProviderName | null = null;
  let fallbackReason: string | null = null;

  if (!enabled) fallbackReason = "AI_ENHANCEMENT_ENABLED is not true";
  else if (providerSetting === "openai") selected = hasOpenAIKey ? "openai" : null;
  else if (providerSetting === "anthropic") selected = hasAnthropicKey ? "anthropic" : null;
  else if (providerSetting === "auto") selected = hasAnthropicKey ? "anthropic" : hasOpenAIKey ? "openai" : null;
  else fallbackReason = "unsupported AI_ENHANCEMENT_PROVIDER";

  if (enabled && !selected && !fallbackReason) {
    fallbackReason = providerSetting === "openai"
      ? "OPENAI_API_KEY missing for openai provider"
      : providerSetting === "anthropic"
        ? "ANTHROPIC_API_KEY missing for anthropic provider"
        : "no provider API key available";
  }

  return {
    enabled,
    providerSetting,
    hasOpenAIKey,
    hasAnthropicKey,
    selected,
    fallbackReason
  };
}

export async function diagnoseAIEnhancementProvider(): Promise<AIProviderDiagnosticResult> {
  const runtime = resolveDiagnosticProvider();
  const diagnostic: AIProviderDiagnosticResult = {
    runtime: {
      enabled: runtime.enabled,
      providerSetting: runtime.providerSetting,
      hasOpenAIKey: runtime.hasOpenAIKey,
      hasAnthropicKey: runtime.hasAnthropicKey
    },
    provider: {
      selected: runtime.selected,
      requestAttempted: false,
      responseStatus: null,
      responseOk: null
    },
    parsing: {
      jsonParsed: false
    },
    fallback: {
      used: Boolean(runtime.fallbackReason),
      reason: runtime.fallbackReason
    }
  };

  if (!runtime.selected) return diagnostic;

  const system = "أعد JSON تشخيصيًا آمنًا فقط ولا تذكر أي مزود أو نموذج.";
  const user = JSON.stringify({
    assistantSummary: "تحسين تشخيصي قصير.",
    findingExplanations: [{ traceabilityId: "diagnostic-finding", explanation: "شرح تشخيصي.", impact: "أثر تشخيصي.", recommendedAction: "إجراء تشخيصي." }],
    rewriteSuggestions: [{ rewriteId: "diagnostic-rewrite", explanation: "شرح صياغة تشخيصي.", suggestedText: "صياغة تشخيصية آمنة." }],
    channelRationales: [{ key: "linkedin", reason: "مبرر تشخيصي.", expectedBenefit: "فائدة تشخيصية.", risks: "قيد تشخيصي." }],
    recommendationSummary: "ملخص تشخيصي."
  });

  try {
    diagnostic.provider.requestAttempted = true;
    const response = runtime.selected === "openai"
      ? await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user }
            ],
            max_tokens: 700
          })
        })
      : await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 700,
            // النماذج بعد Opus 4.6 (ومنها Sonnet 5) ترفض أي حرارة غير 1.0 بخطأ 400 — لا تُضبط
            thinking: { type: "disabled" },
            system,
            messages: [{ role: "user", content: user }]
          })
        });

    diagnostic.provider.responseStatus = response.status;
    diagnostic.provider.responseOk = response.ok;
    if (!response.ok) {
      diagnostic.fallback = { used: true, reason: `${runtime.selected} response not ok` };
      return diagnostic;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; content?: Array<{ type?: string; text?: string }> };
    const content = runtime.selected === "openai"
      ? data.choices?.[0]?.message?.content
      : data.content?.find((item) => item.type === "text")?.text;
    if (!content) {
      diagnostic.fallback = { used: true, reason: `${runtime.selected} response missing content` };
      return diagnostic;
    }
    const parsed = safeParseJsonObject(content);
    diagnostic.parsing.jsonParsed = parsed.parsed;
    diagnostic.rawPayload = parsed.value;
    if (!parsed.parsed) diagnostic.fallback = { used: true, reason: "provider response JSON parsing failed" };
    return diagnostic;
  } catch (error) {
    diagnostic.fallback = {
      used: true,
      reason: error instanceof Error ? `provider request threw: ${error.name}` : "provider request threw"
    };
    return diagnostic;
  }
}
