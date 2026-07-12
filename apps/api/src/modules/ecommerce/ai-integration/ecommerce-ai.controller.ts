import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { RequireModule } from '@dexo/shared';
import { EcommerceAiWorkflows } from './workflows';

/**
 * Manual triggers for ecommerce AI workflow automations. Deliberately manual
 * (not an automatic cron) so a tenant reviews/opts in before real digest
 * emails go out — see workflows/index.ts for the roadmap on making this
 * schedulable and recipient-configurable.
 */
@Controller('ecommerce/ai/workflows')
@UseGuards(JwtAuthGuard)
@RequireModule('ecommerce')
export class EcommerceAiController {
  constructor(private workflows: EcommerceAiWorkflows) {}

  @Post('low-stock-digest')
  runLowStockDigest(@Req() req: any, @Body() body: { recipientEmail?: string }) {
    return this.workflows.runLowStockDigest(req.user.tenantId, body?.recipientEmail);
  }
}
