import type { ChatMessage } from '../core/types';
import type { LlmProvider, LlmResponse, LlmToolSpec } from './types';

/**
 * Deterministic no-network provider for unit tests and local dev without an
 * API key. Calls the FIRST available tool with empty args if the last
 * message is from the user and tools exist, otherwise echoes a canned reply
 * — enough to exercise the AgentRuntime's tool-execution loop end to end.
 */
export class MockProvider implements LlmProvider {
  async chat(messages: ChatMessage[], tools: LlmToolSpec[], _systemPrompt: string): Promise<LlmResponse> {
    const lastToolResult = [...messages].reverse().find((m) => m.role === 'tool');
    if (lastToolResult) {
      return { text: `(mock) Based on the tool result: ${lastToolResult.content.slice(0, 200)}`, toolCalls: [], stopReason: 'end_turn' };
    }
    if (tools.length) {
      return { text: '', toolCalls: [{ id: 'mock-1', name: tools[0].name, args: {} }], stopReason: 'tool_use' };
    }
    return { text: '(mock) No tools available to answer this.', toolCalls: [], stopReason: 'end_turn' };
  }
}
