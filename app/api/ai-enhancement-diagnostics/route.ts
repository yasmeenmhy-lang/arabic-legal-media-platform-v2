import { NextResponse } from "next/server";
import { diagnoseEnhancementSanitization } from "@/lib/services/ai-enhancement-service";
import { diagnoseAIEnhancementProvider } from "@/lib/services/ai-provider-service";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: Request) {
  const configuredToken = process.env.AI_DIAGNOSTICS_TOKEN;
  const providedToken = request.headers.get("x-ai-diagnostics-token");
  if (!configuredToken || !providedToken || providedToken !== configuredToken) return notFound();

  const providerDiagnostic = await diagnoseAIEnhancementProvider();
  const sanitization = diagnoseEnhancementSanitization(providerDiagnostic.rawPayload);
  const fallbackReason =
    providerDiagnostic.fallback.reason ??
    (!providerDiagnostic.parsing.jsonParsed ? "provider response JSON parsing failed" : null) ??
    (!sanitization.accepted ? sanitization.reason : null);

  return NextResponse.json({
    runtime: providerDiagnostic.runtime,
    provider: providerDiagnostic.provider,
    parsing: providerDiagnostic.parsing,
    sanitization,
    fallback: {
      used: providerDiagnostic.fallback.used || !providerDiagnostic.parsing.jsonParsed || !sanitization.accepted,
      reason: fallbackReason
    }
  });
}
