import { Module, OnModuleInit } from '@nestjs/common';
import { PromptRegistry, AgentRegistry } from '@dexo/ai-platform';
import { websitePrompts } from './prompts';
import { websiteAgents } from './agents';

/**
 * Website Builder's AI surface — registers the content-writer agent with the
 * shared AI Gateway (see AiGatewayController: every agent is reached through
 * POST /api/ai/chat, no module owns its own chat endpoint). No controller,
 * no tools: this agent only drafts copy for the tenant to review, it never
 * writes to Menu/MenuItem itself.
 */
@Module({})
export class WebsiteAiModule implements OnModuleInit {
  constructor(
    private promptRegistry: PromptRegistry,
    private agentRegistry: AgentRegistry,
  ) {}

  onModuleInit() {
    this.promptRegistry.register(websitePrompts);
    for (const agent of websiteAgents) this.agentRegistry.register(agent);
  }
}
