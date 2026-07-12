import { Module, OnModuleInit } from '@nestjs/common';
import { NotificationModule } from '@dexo/notification';
import { ToolRegistry, PromptRegistry, AgentRegistry } from '@dexo/ai-platform';
import { EcommerceModule } from '../ecommerce.module';
import { EcommerceAiTools } from './tools';
import { EcommerceCustomerSelfTools } from './tools/customer-self-tools';
import { ecommercePrompts } from './prompts';
import { ecommerceKnowledge } from './knowledge';
import { ecommerceAgents } from './agents';
import { EcommerceAiWorkflows } from './workflows';
import { EcommerceAiController } from './ecommerce-ai.controller';

/**
 * The Ecommerce module's ENTIRE AI surface — copies the FitnessAiModule
 * reference pattern: import the business module for its services, build
 * tools from them, register everything with the shared registries on
 * startup. No AI orchestration code lives here — that's AgentRuntime in
 * @dexo/ai-platform.
 *
 * Two tool sets are registered under DIFFERENT module keys on purpose:
 * "ecommerce" (staff tools, arbitrary productId/orderId/customerId —
 * tenant-admin only) and "ecommerce-self" (customer-facing, self-scoped —
 * storefront/support chatbot). The `ecommerce.customer` agent's moduleKeys
 * is `['ecommerce-self']`, so it structurally cannot reach the staff tools.
 */
@Module({
  imports: [EcommerceModule, NotificationModule],
  providers: [EcommerceAiTools, EcommerceCustomerSelfTools, EcommerceAiWorkflows],
  controllers: [EcommerceAiController],
  exports: [EcommerceAiWorkflows],
})
export class EcommerceAiModule implements OnModuleInit {
  constructor(
    private toolRegistry: ToolRegistry,
    private promptRegistry: PromptRegistry,
    private agentRegistry: AgentRegistry,
    private staffTools: EcommerceAiTools,
    private customerSelfTools: EcommerceCustomerSelfTools,
  ) {}

  onModuleInit() {
    this.toolRegistry.registerModule({
      moduleKey: 'ecommerce',
      tools: this.staffTools.build(),
      knowledge: ecommerceKnowledge,
    });
    this.toolRegistry.registerModule({
      moduleKey: 'ecommerce-self',
      tools: this.customerSelfTools.build(),
    });
    this.promptRegistry.register(ecommercePrompts);
    for (const agent of ecommerceAgents) this.agentRegistry.register(agent);
  }
}
