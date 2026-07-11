import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { WebhooksService } from './webhooks.service';

/**
 * Tenant-facing webhook management ("Integrations" in settings). Any tenant
 * can subscribe an external URL to platform events — order.created,
 * shipment.status_changed, etc. — regardless of business vertical, since the
 * event bus itself is generic (see WebhooksService).
 */
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Get()
  list(@Req() req: any) {
    return this.webhooks.listEndpoints(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.webhooks.createEndpoint(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.webhooks.updateEndpoint(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.deleteEndpoint(req.user.tenantId, id);
  }

  @Get(':id/deliveries')
  deliveries(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.getDeliveries(req.user.tenantId, id);
  }

  @Post(':id/test')
  test(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.testEndpoint(req.user.tenantId, id);
  }
}
