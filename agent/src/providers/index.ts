import type { Provider, ToolDefinition } from "./base.js";
import { ClaudeProvider } from "./claude.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";

export type ProviderName = "claude" | "openai" | "gemini";

const PROVIDER_MODELS: Record<ProviderName, string> = {
  claude: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash",
};

const PROVIDER_KEY_NAMES: Record<ProviderName, string> = {
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GOOGLE_API_KEY",
};

export function createProvider(
  name: ProviderName,
  toolDefs: ToolDefinition[],
  model?: string
): Provider {
  const finalModel = model || PROVIDER_MODELS[name];

  switch (name) {
    case "claude":
      return new ClaudeProvider(toolDefs, finalModel);
    case "openai":
      return new OpenAIProvider(toolDefs, finalModel);
    case "gemini":
      return new GeminiProvider(toolDefs, finalModel);
    default:
      throw new Error(`Unknown provider: ${name}. Use: claude, openai, or gemini`);
  }
}

export function validateProviderEnv(name: ProviderName): void {
  const keyName = PROVIDER_KEY_NAMES[name];
  if (!process.env[keyName]) {
    throw new Error(
      `Missing ${keyName} environment variable.\n` +
      `Set it in agent/.env or export it:\n` +
      `  export ${keyName}=your-key-here`
    );
  }
}

export type { Provider, ToolDefinition, ToolCall, ToolResult, AgentResponse } from "./base.js";
