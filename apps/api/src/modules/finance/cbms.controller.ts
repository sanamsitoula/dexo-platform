import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { CbmsSyncService } from './cbms-sync.service';

@Controller('finance/cbms')
@UseGuards(JwtAuthGuard)
export class CbmsController {
  constructor(private cbmsSync: CbmsSyncService) {}

  /** Retry all due (PENDING/FAILED) CBMS sync-queue rows for this tenant. */
  @Post('retry')
  retry(@Req() req: any) {
    return this.cbmsSync.retryQueue(req.user.tenantId);
  }
}
