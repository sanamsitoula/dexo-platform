import { Inject, Injectable, Logger } from '@nestjs/common';
import { AgentRegistry } from '../core/agent-registry';
import { ToolRegistry } from '../core/tool-registry';
import { PromptRegistry } from '../core/prompt-registry';
import { zodToJsonSchema } from '../core/zod-to-schema';
import type { AgentRunResult, AiContext, ChatMessage } from '../core/types';
import type { LlmProvider } from '../providers/types';
import { LLM_PROVIDER } from '../core/tokens';

const MAX_TOOL_ITERATIONS = 6;

/**
 * The agent orchestration loop — this is the piece that plays the role
 * PydanticAI's runtime would have played, implemented in TypeScript so it
 * runs in-process with the NestJS services it calls (see the runtime
 * decision in docs/ai/00_AI_MASTER_ARCHITECTURE.md).
 *
 * Flow: build the system prompt from AiContext → send to the LLM with the
 * agent's allowed tools → if the model requests a tool call, execute it via
 * ToolRegistry (permission-checked, tenant-scoped) → feed the result back →
 * repeat until the model produces a final answer or MAX_TOOL_ITERATIONS hits.
 */
@Injectable()
export class AgentRuntime {
  private readonly logger = new Logger(AgentRuntime.name);

  constructor(
    private agents: AgentRegistry,
    private tools: ToolRegistry,
    private prompts: PromptRegistry,
    @Inject(LLM_PROVIDER) private provider: LlmProvider,
  ) {}

  async run(agentKey: string, userMessage: string, ctx: AiContext, history: ChatMessage[] = []): Promise<AgentRunResult> {
    const agent = this.agents.get(agentKey);
    if (!agent) throw new Error(`Unknown agent "${agentKey}"`);

    const systemPrompt = agent.systemPromptKey
      ? this.prompts.render(agent.systemPromptKey, { ...ctx })
      : `You are ${agent.name}, ${agent.description}. Tenant: ${ctx.tenantId}. Only use the provided tools for data — never invent numbers.`;

    const toolDefs = this.tools.getToolsFor(agent.moduleKeys);
    const toolSpecs = toolDefs.map((t) => ({ name: t.name, description: t.description, inputSchema: zodToJsonSchema(t.argsSchema) }));

    const messages: ChatMessage[] = [...history, { role: 'user', content: userMessage }];
    const toolCallLog: AgentRunResult['toolCalls'] = [];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await this.provider.chat(messages, toolSpecs, systemPrompt);

      if (response.stopReason !== 'tool_use' || response.toolCalls.length === 0) {
        messages.push({ role: 'assistant', content: response.text });
        return { reply: response.text, toolCalls: toolCallLog, messages };
      }

      messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });

      for (const call of response.toolCalls) {
        let resultPayload: any;
        try {
          resultPayload = await this.tools.execute(agent.moduleKeys, call.name, call.args, ctx);
        } catch (e) {
          resultPayload = { error: (e as Error).message };
          this.logger.warn(`Tool "${call.name}" failed for tenant ${ctx.tenantId}: ${(e as Error).message}`);
        }
        toolCallLog.push({ tool: call.name, args: call.args, result: resultPayload });
        messages.push({
          role: 'tool',
          content: JSON.stringify(resultPayload),
          toolCallId: call.id,
          toolName: call.name,
        });
      }
    }

    return {
      reply: 'I had to stop after several tool calls without reaching a final answer — please rephrase or narrow the request.',
      toolCalls: toolCallLog,
      messages,
    };
  }
}
