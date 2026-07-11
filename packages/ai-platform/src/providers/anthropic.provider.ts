import type { ChatMessage } from '../core/types';
import type { LlmProvider, LlmResponse, LlmToolSpec } from './types';

/**
 * Anthropic Messages API provider — plain `fetch`, no SDK dependency (keeps
 * this package's footprint small; swap in @anthropic-ai/sdk later if richer
 * features like streaming are needed without changing the LlmProvider
 * interface or any agent/tool code).
 *
 * Requires ANTHROPIC_API_KEY. Model defaults to a fast, cheap model suitable
 * for tool-calling; override via ANTHROPIC_MODEL.
 */
export class AnthropicProvider implements LlmProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set — AnthropicProvider cannot be used without it.');
    }
  }

  async chat(messages: ChatMessage[], tools: LlmToolSpec[], systemPrompt: string): Promise<LlmResponse> {
    const anthropicMessages = this.toAnthropicMessages(messages);
    const body: Record<string, any> = {
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    };
    if (tools.length) {
      body.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }
    const data = await res.json();

    const toolCalls = (data.content || [])
      .filter((b: any) => b.type === 'tool_use')
      .map((b: any) => ({ id: b.id, name: b.name, args: b.input }));
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    const stopReason =
      data.stop_reason === 'tool_use' ? 'tool_use' : data.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn';

    return { text, toolCalls, stopReason };
  }

  /**
   * Maps our provider-agnostic ChatMessage[] onto Anthropic's content-block
   * format. Assistant messages that made tool calls carry `toolCalls`
   * (preserved from the previous LlmResponse) so they're replayed as proper
   * `tool_use` blocks — required for Anthropic to pair them with the
   * following `tool_result` blocks.
   */
  private toAnthropicMessages(messages: ChatMessage[]): any[] {
    const out: any[] = [];
    for (const m of messages) {
      if (m.role === 'tool') {
        out.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }],
        });
      } else if (m.role === 'assistant' && m.toolCalls?.length) {
        const blocks: any[] = [];
        if (m.content) blocks.push({ type: 'text', text: m.content });
        for (const tc of m.toolCalls) blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args });
        out.push({ role: 'assistant', content: blocks });
      } else if (m.role === 'user' || m.role === 'assistant') {
        out.push({ role: m.role, content: m.content });
      }
      // 'system' is passed separately via the `system` field, not in messages[].
    }
    return out;
  }
}
