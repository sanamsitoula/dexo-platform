import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

/**
 * Generic outbound webhook bus. Import WebhooksModule and inject
 * WebhooksService into ANY module to emit events — no per-module wiring
 * needed beyond calling `webhooks.emit(tenantId, 'my.event', payload)`.
 */
@Module({
  imports: [PrismaModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}
