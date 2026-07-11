import { Injectable } from '@nestjs/common';
import type { AiAgentDefinition } from './types';

/** Registry of agent DEFINITIONS (which modules' tools an agent may use, its system prompt). */
@Injectable()
export class AgentRegistry {
  private agents = new Map<string, AiAgentDefinition>();

  register(agent: AiAgentDefinition) {
    this.agents.set(agent.key, agent);
  }

  get(key: string): AiAgentDefinition | undefined {
    return this.agents.get(key);
  }

  list(): AiAgentDefinition[] {
    return [...this.agents.values()];
  }
}
