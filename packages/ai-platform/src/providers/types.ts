import type { ChatMessage } from '../core/types';

export interface LlmToolSpec {
  name: string;
  description: string;
  /** JSON schema (from zod-to-json-schema, or a hand-rolled equivalent). */
  inputSchema: Record<string, any>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  args: any;
}

export interface LlmResponse {
  /** Plain text portion of the reply, if any. */
  text: string;
  /** Tool calls the model wants executed before it can finish (empty when done). */
  toolCalls: LlmToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'error';
}

/** Pluggable LLM backend — swap providers without touching agent/tool code. */
export interface LlmProvider {
  chat(messages: ChatMessage[], tools: LlmToolSpec[], systemPrompt: string): Promise<LlmResponse>;
}
