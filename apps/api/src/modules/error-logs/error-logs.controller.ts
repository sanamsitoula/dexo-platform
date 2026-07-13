import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';

/** Platform-admin visibility into every unhandled 5xx the API's
 * CentralErrorFilter has caught — see apps/api/src/main.ts. This is what
 * makes a crash visible in the UI even when the API was started manually
 * (npm run dev) rather than through run.bat's log-capturing orchestrator. */
@ApiTags('error-logs')
@Controller('error-logs')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class ErrorLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List recent unhandled API errors (platform admin only)' })
  async list(@Query('limit') limit?: string, @Query('tenantId') tenantId?: string) {
    return this.prisma.errorLog.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '100', 10) || 100, 500),
    });
  }
}
