export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AgentResponse {
  text: string | null;
  toolCalls: ToolCall[];
  done: boolean;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
}

export interface Provider {
  name: string;
  sendMessage(userMessage: string): Promise<AgentResponse>;
  sendToolResults(results: ToolResult[]): Promise<AgentResponse>;
}
