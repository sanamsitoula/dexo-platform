import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { RequireModule } from '@dexo/shared';
import { FitnessAiWorkflows } from './workflows';

/**
 * Manual triggers for fitness AI workflow automations. Deliberately manual
 * (not an automatic cron) so a tenant reviews/opts in before real reminder
 * emails go out to real members — see workflows/index.ts for the roadmap on
 * making this schedulable.
 */
@Controller('fitness/ai/workflows')
@UseGuards(JwtAuthGuard)
@RequireModule('fitness')
export class FitnessAiController {
  constructor(private workflows: FitnessAiWorkflows) {}

  @Post('membership-expiry')
  runMembershipExpiryCheck(@Req() req: any, @Body() body: { days?: number }) {
    return this.workflows.runMembershipExpiryCheck(req.user.tenantId, body?.days ?? 7);
  }
}
