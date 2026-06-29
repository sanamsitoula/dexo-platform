import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '@dexo/shared';
import { AuthModule } from '@dexo/auth';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
