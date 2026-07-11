# Dexo AI Platform (DAP) — Master Architecture

Status: **Phase 1 foundation built + live reference integration (Fitness module)**.
This single document covers what the original 18-document outline proposed,
organized as sections — written as one doc rather than eighteen because only
Phase 1 is actually built; splitting unbuilt sections into separate files
would produce mostly-empty placeholders. Sections are added to their own
file once they have real content (see "Roadmap" at the end).

## The one decision that shapes everything below

The original proposal named **PydanticAI** as the runtime. PydanticAI is
Python-only; this monorepo is TypeScript/NestJS end to end. Decision made
2026-07-11 (recorded here since it's the fork every other design choice
depends on): **the agent/tool/prompt/context runtime is built in TypeScript,
in-process with the NestJS API** — not a separate Python microservice.

Why this, not a Python sidecar:
- Tools call existing NestJS services **in-process** — no network hop, no
  re-implementing auth/tenant-context propagation across a language
  boundary, no second deployment pipeline to operate.
- One language for the whole team; a new module's AI integration is written
  by the same engineer who wrote the module, not handed to a separate
  Python team.
- We lose nothing architecturally — every concept in the original proposal
  (agent registry, tool registry, prompt registry, context engine, knowledge
  graph, RAG, memory) applies identically; only the implementation language
  changed.

If a future need genuinely requires Python's ML ecosystem (e.g. local
embedding models, `unstructured` for document parsing), the plan is a
**narrow** Python service for just that piece, called as a tool like any
other external system — not a rewrite of the orchestration layer.

## Architecture (as built)

```
                    Web / Mobile
                         │
              POST /api/ai/chat   (apps/api/src/modules/ai-gateway)
                  { agentKey, message, ... }
                         │
              ┌──────────┴──────────┐
              │   ContextEngine     │  tenant, user, roles, permissions,
              │  (@dexo/ai-platform)│  branch, domainType, locale/currency/tz
              └──────────┬──────────┘
                         │  AiContext
                         ▼
              ┌──────────────────────┐
              │   AgentRuntime        │  the orchestration loop
              │  (@dexo/ai-platform)  │  (plays PydanticAI's role, in TS)
              └──────────┬────────────┘
           ┌─────────────┼──────────────┐
           ▼              ▼              ▼
   AgentRegistry   PromptRegistry   ToolRegistry
  (which agent,    (system prompt,  (permission-checked
   which modules)   parameterized)   tool execution)
                                          │
                                          ▼
                              Existing NestJS Services
                          (MembersService, EcommerceService, ...)
                                          │
                                          ▼
                                     Prisma / Postgres

Every AI turn is written to AiInteractionLog (full audit trail).
```

## Why AI doesn't live inside modules

A module never imports an LLM SDK or writes prompt/orchestration logic. It
exposes metadata to the shared registries and nothing else:

```ts
// apps/api/src/modules/<module>/ai-integration/<module>-ai.module.ts
@Module({ imports: [<Module>Module, NotificationModule], ... })
export class <Module>AiModule implements OnModuleInit {
  onModuleInit() {
    this.toolRegistry.registerModule({ moduleKey: '<module>', tools, knowledge });
    this.promptRegistry.register(prompts);
    for (const agent of agents) this.agentRegistry.register(agent);
  }
}
```

That's the whole contract. `FitnessAiModule`
(`apps/api/src/modules/fitness/ai-integration/`) is the reference
implementation — copy its file layout (`tools/`, `prompts/`, `knowledge/`,
`agents/`, `workflows/`, `validators/`) for the next module.

## Tools never touch the database directly

Every `AiTool.execute()` calls an **existing service method** — the same
one a controller calls — never Prisma directly. This means:
- Every validation rule and business invariant the platform already has is
  automatically respected by the AI.
- Tenant isolation is inherited for free: services already scope by
  `tenantId`, and `AiContext.tenantId` comes from the authenticated JWT, not
  from anything the model can influence.
- `AiTool.requiredPermission` is checked by `ToolRegistry.execute()` before
  the underlying service is ever called — an agent literally cannot invoke
  a tool the caller's role doesn't have permission for.

## Context Engine

`ContextEngine.build(user, extra)` resolves once per request:
`tenantId`, `userId`, `isPlatformAdmin`, `roles`, `permissions`
(from `Role.permissions`, same source `ModuleAccessGuard`/RBAC use),
`domainType`, `locale`/`currency`/`timezone` (from tenant settings), plus
whatever the frontend supplies about what the user is currently looking at
(`branchId`, `screen`, `recordId`). No module writes its own
"who is this user" logic.

## Agent Runtime — the orchestration loop

`AgentRuntime.run(agentKey, message, ctx, history?)`:
1. Resolve the agent definition (which module tool sets it may use, its
   system prompt key).
2. Render the system prompt via `PromptRegistry` with `ctx` as variables.
3. Send the conversation + the agent's allowed tool specs (converted from
   Zod schemas to JSON Schema, `core/zod-to-schema.ts`) to the configured
   `LlmProvider`.
4. If the model requests a tool call: execute it via `ToolRegistry.execute`
   (permission-checked), feed the result back, repeat (capped at 6 rounds).
5. Return the final reply + the full list of tool calls made (for the audit
   log and for the UI to show "used: getMember, expiringMemberships").

`LlmProvider` is an interface — `AnthropicProvider` (fetch-based, no SDK
dependency) is implemented; a `MockProvider` lets the whole pipeline run
without an API key for local dev/tests. Swapping providers (OpenAI,
Azure OpenAI, a local model) means writing one new class, not touching
agents or tools.

## AI Gateway — the one HTTP surface

`apps/api/src/modules/ai-gateway/`: `GET /api/ai/agents` (list registered
agents for a frontend picker), `POST /api/ai/chat` (run one turn). No module
owns its own chat endpoint — this is deliberate, matching "AI Gateway / Chat
API" in the original proposal as a first-class platform service, not a
per-module feature.

## Audit logging (Safety Rules — built)

Every `/api/ai/chat` call writes one `AiInteractionLog` row: tenant, user,
agent, the user's message, the reply, and the full `toolCalls` array (tool
name + args + result) — so any AI-initiated action is traceable to exactly
who asked for it and what the AI actually did. Logging failure never blocks
the chat response (best-effort, matches the platform's existing pattern for
non-critical side effects).

## Reference integration: Fitness

`apps/api/src/modules/fitness/ai-integration/` — five personas (Reception,
Trainer, Nutrition, Management, Finance) sharing one tool set (registered
under `moduleKey: "fitness"`), ~18 tools wrapping real `MembersService` /
`MembershipsService` / `TrainersService` / `WorkoutPlansService` /
`DietPlansService` / `CheckinService` / `GroupClassesService` methods, plus
one wired workflow (`runMembershipExpiryCheck` — manually triggered via
`POST /api/fitness/ai/workflows/membership-expiry`, deliberately not an
automatic cron yet, so no tenant gets surprise emails to their members
without opting in).

**Real bug found and fixed while building this**: the spec asked for a
`sendReminder` tool targeting one member's email. The only existing
notification path (`NotificationService.sendAnnouncement`) always broadcasts
to an audience *segment*, ignoring a specific recipient — using it as
written would have emailed the tenant's entire active-member list instead of
one person. Added `NotificationService.sendDirect(tenantId, {to, title,
message})` (a genuinely single-recipient send) rather than papering over it.

## Roadmap — sections from the original 18-doc outline not yet built

Each of these is real, scoped work — not fabricated as done:

| Original doc | Status |
|---|---|
| 01/02 Agent SDK / runtime | **Built** — `AgentRuntime` (this doc, above) |
| 04 Context Engine | **Built** — `ContextEngine` (this doc, above) |
| 06 Prompt Registry | **Built** — `PromptRegistry` |
| 07 Tool Registry | **Built** — `ToolRegistry`, permission-gated |
| 09 Permission Engine | **Built** — reuses `Role.permissions` + `requiredPermission` per tool; no new engine needed |
| 15 Module Integration | **Built** — pattern documented above, Fitness is the reference |
| 16 Security | **Partial** — tenant scoping + permission gating built; no rate-limiting on `/api/ai/chat` yet, no prompt-injection hardening beyond "tools never take tenantId from the model" |
| 03 Knowledge Graph | **Not started** — `AiKnowledgeChunk[]` exists as a data shape (Fitness registers two chunks) but nothing indexes/searches it yet; "the Prisma schema becomes the graph" needs a schema-introspection job, not written |
| 05 Memory Engine | **Not started** — no conversation/business/workflow memory persistence; `AgentRuntime.run` accepts a `history` param but nothing stores/retrieves it across sessions yet |
| 08 RAG Engine | **Not started** — no vector index; knowledge chunks are inlined into prompts, not retrieved semantically |
| 10 Database Tools | **Built implicitly** — every fitness tool *is* a typed database-tool wrapper; no separate generic "any-model" query tool exists (intentionally — that would reopen the "let the LLM query the DB" door this architecture exists to close) |
| 11 Vector Search | **Not started** — depends on 08 |
| 12 Document AI / OCR | **Not started** |
| 13 Workflow Engine | **Partial** — one manually-triggered workflow exists (`runMembershipExpiryCheck`); no generic scheduler/engine, no approval-gated multi-step workflows |
| 14 Event-Driven Agents | **Not started** — the generic webhook bus (`docs/ECOMMERCE_MODULE.md`) could trigger an agent run on an event, but nothing wires that yet |
| 17 Deployment | **Not started** — no separate deploy considerations exist yet since the runtime is in-process with the API; `ANTHROPIC_API_KEY` is the only new env var |
| 18 Roadmap | This table |

## Next module to integrate

Ecommerce is the natural second reference (real services already exist —
see `docs/ECOMMERCE_MODULE.md`) and would prove the pattern generalizes
beyond fitness: `apps/api/src/modules/ecommerce/ai-integration/` following
the exact same five folders and `OnModuleInit` registration shown above.
