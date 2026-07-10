import { Controller, Get, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/audit
   * Get audit logs.
   * - Platform admin (req.user.isPlatformAdmin) can see logs from any tenant via ?tenantId=...
   * - Tenant user sees only their own tenant's logs.
   */
  @Get()
  @ApiOperation({ summary: 'Get audit logs (tenant-scoped or platform-wide)' })
  async getTenantLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tenantId') tenantIdQuery?: string,
    @Query('search') search?: string,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }

    let effectiveTenantId: string | undefined;
    if (req.user.isPlatformAdmin) {
      effectiveTenantId = tenantIdQuery || undefined;
    } else {
      if (!req.user.tenantId) {
        throw new ForbiddenException('User is not associated with a tenant');
      }
      effectiveTenantId = req.user.tenantId;
    }

    return this.auditService.getAuditLogs({
      tenantId: effectiveTenantId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      action,
      resourceType,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs for user' })
  async getUserLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const userId = req.params.userId;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.auditService.getUserAuditLogs(userId, {
      tenantId: req.user.isPlatformAdmin ? undefined : req.user.tenantId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('resource/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get audit logs for resource' })
  async getResourceLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const { resourceType, resourceId } = req.params;
    return this.auditService.getResourceAuditLogs(
      resourceType,
      resourceId,
      req.user.isPlatformAdmin ? undefined : req.user.tenantId,
      {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      },
    );
  }

  @Get('actions')
  @ApiOperation({ summary: 'List all known audit actions' })
  async listActions() {
    return this.auditService.listActions();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Audit log statistics' })
  async stats(@Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.auditService.getStats(
      req.user.isPlatformAdmin ? undefined : req.user.tenantId,
    );
  }
}
