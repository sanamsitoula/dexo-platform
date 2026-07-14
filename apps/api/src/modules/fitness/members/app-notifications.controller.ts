import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { AppNotificationsService } from './app-notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class AppNotificationsController {
  constructor(private service: AppNotificationsService) {}

  /** The signed-in user's own (MEMBER) feed — powers the mobile Notifications tab. */
  @Get('me')
  mine(@Req() req: any, @Query() query: any) {
    return this.service.listForUser(req.user.tenantId, req.user.id, {
      page: query?.page ? parseInt(query.page) : undefined,
      limit: query?.limit ? parseInt(query.limit) : undefined,
      unreadOnly: query?.unreadOnly === 'true',
    });
  }

  /** Shared tenant-admin alert feed — powers the admin dashboard bell. */
  @Get('admin')
  adminFeed(@Req() req: any, @Query() query: any) {
    return this.service.listForAdmin(req.user.tenantId, {
      page: query?.page ? parseInt(query.page) : undefined,
      limit: query?.limit ? parseInt(query.limit) : undefined,
      unreadOnly: query?.unreadOnly === 'true',
    });
  }

  @Post(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markRead(req.user.tenantId, id, req.user.id);
  }

  @Post('read-all')
  markAllRead(@Req() req: any, @Query('audience') audience?: string) {
    const aud = audience === 'admin' ? 'TENANT_ADMIN' : 'MEMBER';
    return this.service.markAllRead(req.user.tenantId, req.user.id, aud);
  }
}
