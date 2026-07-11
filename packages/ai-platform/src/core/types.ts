import { z } from 'zod';

/**
 * Dexo AI Platform — core types.
 *
 * A "tool" wraps ONE existing NestJS service method as something an LLM can
 * call. Tools never touch Prisma/SQL directly — they call the same services
 * your controllers already call, so every business rule, validation, and
 * tenant-scoping the platform already has is automatically respected.
 */
export interface AiTool<TArgs = any, TResult = any> {
  /** Unique within its module, e.g. "stockLevel", "customerBalance". */
  name: string;
  description: string;
  /** Zod schema — validates LLM-provided args AND generates the JSON schema sent to the model. */
  argsSchema: z.ZodType<TArgs>;
  /**
   * Executes the tool. `ctx` is always the resolved AiContext for the
   * calling user — implementations MUST scope every query by
   * `ctx.tenantId` (never trust args for tenant scoping).
   */
  execute: (args: TArgs, ctx: AiContext) => Promise<TResult>;
  /** Optional: restrict to specific roles/permission strings. Enforced by ToolRegistry before execute() runs. */
  requiredPermission?: string;
}

/** A registered module's full AI surface — mirrors registerTools()/registerPrompts()/etc. in the proposal. */
export interface AiModuleRegistration {
  /** Module key, e.g. "ecommerce", "fitness", "salon". Matches @RequireModule() keys where applicable. */
  moduleKey: string;
  tools?: AiTool[];
  prompts?: AiPromptTemplate[];
  /** Free-text knowledge chunks (policies, glossary, FAQs) indexed for RAG — see docs/ai/08_RAG_ENGINE.md (roadmap). */
  knowledge?: AiKnowledgeChunk[];
}

export interface AiPromptTemplate {
  key: string; // "ecommerce.dashboard_summary", "finance.explain_variance"
  /** Handlebars-style {{var}} placeholders, filled from AiContext + tool results. */
  template: string;
  description?: string;
}

export interface AiKnowledgeChunk {
  id: string;
  moduleKey: string;
  title: string;
  content: string;
}

/**
 * Resolved per-request context — the Context Engine's output. Every agent
 * run receives exactly one of these; tools receive it as their second arg.
 */
export interface AiContext {
  tenantId: string;
  userId: string;
  isPlatformAdmin: boolean;
  roles: string[];
  permissions: string[];
  branchId?: string | null;
  domainType?: string | null; // FITNESS_CENTER, ECOMMERCE, ...
  locale?: string;
  currency?: string;
  timezone?: string;
  /** Whatever screen/record the user was looking at when they opened the assistant — optional, UI-supplied. */
  screen?: string;
  recordId?: string;
}

export interface AiAgentDefinition {
  key: string; // "ecommerce", "finance", "platform"
  name: string;
  description: string;
  /** Module keys whose tools this agent is allowed to call. */
  moduleKeys: string[];
  systemPromptKey?: string; // resolved via PromptRegistry
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** On role:"tool" messages — which call this result answers. */
  toolCallId?: string;
  toolName?: string;
  /** On role:"assistant" messages that requested tool calls — preserved so providers can replay them correctly next turn. */
  toolCalls?: Array<{ id: string; name: string; args: any }>;
}

export interface AgentRunResult {
  reply: string;
  toolCalls: Array<{ tool: string; args: any; result: any }>;
  messages: ChatMessage[];
}
