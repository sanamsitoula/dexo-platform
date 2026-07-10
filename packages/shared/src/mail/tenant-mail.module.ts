import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { TenantMailService } from './tenant-mail.service';

@Module({
  imports: [PrismaModule],
  providers: [TenantMailService],
  exports: [TenantMailService],
})
export class TenantMailModule {}
