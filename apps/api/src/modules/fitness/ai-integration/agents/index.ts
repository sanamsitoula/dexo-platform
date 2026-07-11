import type { AiAgentDefinition } from '@dexo/ai-platform';

/**
 * Five fitness personas, all sharing the SAME tool set (registered under
 * moduleKey "fitness") but with different system prompts and — via each
 * tool's `requiredPermission` — effectively different capabilities. A
 * receptionist and an owner both talk to "the fitness AI," but the tools
 * available to them are gated by their actual role permissions, not by
 * which agent key the frontend happens to call.
 */
export const fitnessAgents: AiAgentDefinition[] = [
  {
    key: 'fitness.reception',
    name: 'Reception Assistant',
    description: 'Front-desk assistant for member lookup, check-in and membership status',
    moduleKeys: ['fitness'],
    systemPromptKey: 'fitness.reception',
  },
  {
    key: 'fitness.trainer',
    name: 'Trainer Assistant',
    description: 'Assistant for trainers reviewing their clients, workout and diet plans',
    moduleKeys: ['fitness'],
    systemPromptKey: 'fitness.trainer',
  },
  {
    key: 'fitness.nutrition',
    name: 'Nutrition Assistant',
    description: 'Diet-plan and nutrition guidance grounded in stored member data',
    moduleKeys: ['fitness'],
    systemPromptKey: 'fitness.nutrition',
  },
  {
    key: 'fitness.management',
    name: 'Management Assistant',
    description: 'Retention, attendance and growth insight for managers/owners',
    moduleKeys: ['fitness'],
    systemPromptKey: 'fitness.management',
  },
  {
    key: 'fitness.finance',
    name: 'Finance Assistant',
    description: 'Membership payment and revenue questions, finance-tools only',
    moduleKeys: ['fitness'],
    systemPromptKey: 'fitness.finance',
  },
];
