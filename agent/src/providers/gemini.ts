import { GoogleGenAI, type Content, type FunctionDeclaration, Type } from "@google/genai";
import type { Provider, AgentResponse, ToolResult, ToolDefinition } from "./base.js";
import { SYSTEM_PROMPT } from "../prompt.js";

function convertType(jsonType: string): Type {
  const map: Record<string, Type> = {
    string: Type.STRING,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
    object: Type.OBJECT,
    array: Type.ARRAY,
  };
  return map[jsonType] || Type.STRING;
}

function convertProperties(
  props: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(props)) {
    result[key] = {
      type: convertType(val.type || "string"),
      description: val.description || "",
    };
    if (val.enum) result[key].enum = val.enum;
  }
  return result;
}

export class GeminiProvider implements Provider {
  name = "Gemini";
  private client: GoogleGenAI;
  private model: string;
  private history: Content[] = [];
  private tools: FunctionDeclaration[];

  constructor(toolDefs: ToolDefinition[], model = "gemini-2.5-flash") {
    this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
    this.model = model;
    this.tools = toolDefs.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: Type.OBJECT,
        properties: convertProperties(t.parameters.properties),
        required: t.parameters.required || [],
      },
    }));
  }

  private parseResponse(response: any): AgentResponse {
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let text: string | null = null;
    const toolCalls: AgentResponse["toolCalls"] = [];

    for (const part of parts) {
      if (part.text) {
        text = (text || "") + part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: part.functionCall.name + "_" + Date.now(),
          name: part.functionCall.name,
          input: (part.functionCall.args || {}) as Record<string, unknown>,
        });
      }
    }

    return {
      text,
      toolCalls,
      done: toolCalls.length === 0,
    };
  }

  async sendMessage(userMessage: string): Promise<AgentResponse> {
    this.history.push({ role: "user", parts: [{ text: userMessage }] });

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: this.history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: this.tools }],
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content) {
      this.history.push(candidate.content as Content);
    }

    return this.parseResponse(response);
  }

  async sendToolResults(results: ToolResult[]): Promise<AgentResponse> {
    const parts = results.map((r) => ({
      functionResponse: {
        name: r.toolCallId.split("_")[0],
        response: { result: r.output },
      },
    }));

    this.history.push({ role: "user", parts });

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: this.history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: this.tools }],
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content) {
      this.history.push(candidate.content as Content);
    }

    return this.parseResponse(response);
  }
}
