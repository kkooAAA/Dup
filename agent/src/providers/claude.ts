import Anthropic from "@anthropic-ai/sdk";
import type { Provider, AgentResponse, ToolResult, ToolDefinition } from "./base.js";
import { SYSTEM_PROMPT } from "../prompt.js";

export class ClaudeProvider implements Provider {
  name = "Claude";
  private client: Anthropic;
  private model: string;
  private messages: Anthropic.MessageParam[] = [];
  private tools: Anthropic.Tool[];

  constructor(toolDefs: ToolDefinition[], model = "claude-sonnet-4-6") {
    this.client = new Anthropic();
    this.model = model;
    this.tools = toolDefs.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: t.parameters.type,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    }));
  }

  private parseResponse(response: Anthropic.Message): AgentResponse {
    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      }));

    return {
      text: textBlocks.length > 0 ? textBlocks.join("\n") : null,
      toolCalls,
      done: response.stop_reason !== "tool_use",
    };
  }

  async sendMessage(userMessage: string): Promise<AgentResponse> {
    this.messages.push({ role: "user", content: userMessage });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      tools: this.tools,
      messages: this.messages,
    });

    this.messages.push({ role: "assistant", content: response.content });
    return this.parseResponse(response);
  }

  async sendToolResults(results: ToolResult[]): Promise<AgentResponse> {
    this.messages.push({
      role: "user",
      content: results.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.toolCallId,
        content: r.output,
      })),
    });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      tools: this.tools,
      messages: this.messages,
    });

    this.messages.push({ role: "assistant", content: response.content });
    return this.parseResponse(response);
  }
}
