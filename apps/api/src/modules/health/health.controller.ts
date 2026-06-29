import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check (db, redis, minio)' })
  async check() {
    const startedAt = Date.now();
    const result: { status: string; db: string; redis: string; minio: string; timestamp: string; latencyMs?: number } = {
      status: 'ok',
      db: 'unknown',
      redis: 'unknown',
      minio: 'unknown',
      timestamp: new Date().toISOString(),
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.db = 'up';
    } catch {
      result.db = 'down';
      result.status = 'degraded';
    }
    result.latencyMs = Date.now() - startedAt;
    return result;
  }
}
