import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { AgentRegistry } from './core/agent-registry';
import { ToolRegistry } from './core/tool-registry';
import { PromptRegistry } from './core/prompt-registry';
import { ContextEngine } from './core/context-engine';
import { AgentRuntime } from './runtime/agent-runtime';
import { AnthropicProvider } from './providers/anthropic.provider';
import { MockProvider } from './providers/mock.provider';
import type { LlmProvider } from './providers/types';
import { LLM_PROVIDER } from './core/tokens';

export { LLM_PROVIDER };

/**
 * Import once in AppModule. Every business module then injects
 * ToolRegistry/PromptRegistry/AgentRegistry to register itself — see
 * FitnessAiModule for the reference integration.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AgentRegistry,
    ToolRegistry,
    PromptRegistry,
    ContextEngine,
    AgentRuntime,
    {
      provide: LLM_PROVIDER,
      useFactory: (): LlmProvider => {
        // No ANTHROPIC_API_KEY configured (e.g. local dev) → fall back to the
        // deterministic mock so the platform boots and tool wiring is testable
        // without a live key. Set ANTHROPIC_API_KEY to use the real model.
        if (!process.env.ANTHROPIC_API_KEY) return new MockProvider();
        return new AnthropicProvider();
      },
    },
  ],
  exports: [AgentRegistry, ToolRegistry, PromptRegistry, ContextEngine, AgentRuntime, LLM_PROVIDER],
})
export class AiPlatformModule {}
