import { Body, Controller, Get, Post, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { AgentRegistry, AgentRuntime, ContextEngine } from '@dexo/ai-platform';

/**
 * The single, module-agnostic AI entry point — "AI Gateway / Chat API" in
 * the master architecture. Every agent (fitness.reception, ecommerce.sales,
 * whatever gets registered next) is reached through this one controller;
 * no module owns its own chat endpoint.
 */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiGatewayController {
  constructor(
    private agents: AgentRegistry,
    private runtime: AgentRuntime,
    private context: ContextEngine,
    private prisma: PrismaService,
  ) {}

  /** Agents visible to the caller — the frontend uses this to render an assistant picker. */
  @Get('agents')
  listAgents() {
    return this.agents.list().map((a) => ({ key: a.key, name: a.name, description: a.description }));
  }

  @Post('chat')
  async chat(@Req() req: any, @Body() body: { agentKey: string; message: string; branchId?: string; screen?: string; recordId?: string }) {
    if (!body?.agentKey || !body?.message) throw new BadRequestException('agentKey and message are required');

    const ctx = await this.context.build(req.user, { branchId: body.branchId, screen: body.screen, recordId: body.recordId });
    const result = await this.runtime.run(body.agentKey, body.message, ctx);

    // Full audit trail — every AI action is traceable to who asked for it.
    if (ctx.tenantId) {
      await this.prisma.aiInteractionLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          agentKey: body.agentKey,
          userMessage: body.message,
          reply: result.reply,
          toolCalls: result.toolCalls as any,
        },
      }).catch(() => { /* audit logging must never break the chat response */ });
    }

    return { reply: result.reply, toolCalls: result.toolCalls };
  }
}
