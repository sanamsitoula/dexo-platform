import { Module, OnModuleInit } from '@nestjs/common';
import { NotificationModule } from '@dexo/notification';
import { ToolRegistry, PromptRegistry, AgentRegistry } from '@dexo/ai-platform';
import { FitnessModule } from '../fitness.module';
import { FitnessAiTools } from './tools';
import { fitnessPrompts } from './prompts';
import { fitnessKnowledge } from './knowledge';
import { fitnessAgents } from './agents';
import { FitnessAiWorkflows } from './workflows';
import { FitnessAiController } from './fitness-ai.controller';

/**
 * The Fitness module's ENTIRE AI surface — this file is the reference
 * pattern every future module's AI integration should copy: import the
 * business module for its services, build tools from them, register
 * everything with the shared registries on startup. No AI orchestration
 * code lives here — that's AgentRuntime in @dexo/ai-platform.
 */
@Module({
  imports: [FitnessModule, NotificationModule],
  providers: [FitnessAiTools, FitnessAiWorkflows],
  controllers: [FitnessAiController],
  exports: [FitnessAiWorkflows],
})
export class FitnessAiModule implements OnModuleInit {
  constructor(
    private toolRegistry: ToolRegistry,
    private promptRegistry: PromptRegistry,
    private agentRegistry: AgentRegistry,
    private fitnessTools: FitnessAiTools,
  ) {}

  onModuleInit() {
    this.toolRegistry.registerModule({
      moduleKey: 'fitness',
      tools: this.fitnessTools.build(),
      knowledge: fitnessKnowledge,
    });
    this.promptRegistry.register(fitnessPrompts);
    for (const agent of fitnessAgents) this.agentRegistry.register(agent);
  }
}
