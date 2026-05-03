import { registerAiGateway } from "@/lib/ai/gateway";
import { createOpenAiCompatibleGateway } from "@/lib/ai/openai-gateway";
import { env } from "@/lib/env";

export async function register() {
  if (process.env.DEMO_MODE === "true" && process.env.VERCEL_ENV === "production") {
    throw new Error(
      "DEMO_MODE cannot be enabled when VERCEL_ENV is production. Remove demo flags from production environment variables.",
    );
  }

  if (!env.OPENAI_API_KEY) return;

  registerAiGateway(
    createOpenAiCompatibleGateway({
      apiKey: env.OPENAI_API_KEY,
      ...(env.OPENAI_BASE_URL ? { baseUrl: env.OPENAI_BASE_URL } : {}),
    }),
  );
}
