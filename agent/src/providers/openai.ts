import OpenAI from "openai";
import type { Provider, AgentResponse, ToolResult, ToolDefinition } from "./base.js";
import { SYSTEM_PROMPT } from "../prompt.js";

export class OpenAIProvider implements Provider {
  name = "OpenAI";
  private client: OpenAI;
  private model: string;
  private messages: OpenAI.ChatCompletionMessageParam[] = [];
  private tools: OpenAI.ChatCompletionTool[];

  constructor(toolDefs: ToolDefinition[], model = "gpt-4o") {
    this.client = new OpenAI();
    this.model = model;
    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.tools = toolDefs.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  private parseResponse(
    response: OpenAI.ChatCompletion
  ): AgentResponse {
    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls = (message.tool_calls || []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      text: message.content,
      toolCalls,
      done: choice.finish_reason !== "tool_calls",
    };
  }

  async sendMessage(userMessage: string): Promise<AgentResponse> {
    this.messages.push({ role: "user", content: userMessage });

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 8096,
      tools: this.tools,
      messages: this.messages,
    });

    const message = response.choices[0].message;
    this.messages.push(message);
    return this.parseResponse(response);
  }

  async sendToolResults(results: ToolResult[]): Promise<AgentResponse> {
    for (const result of results) {
      this.messages.push({
        role: "tool",
        tool_call_id: result.toolCallId,
        content: result.output,
      });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 8096,
      tools: this.tools,
      messages: this.messages,
    });

    const message = response.choices[0].message;
    this.messages.push(message);
    return this.parseResponse(response);
  }
}
