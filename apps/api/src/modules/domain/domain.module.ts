import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { JwtAuthGuard } from '@dexo/auth';
import { DomainService } from './domain.service';
import { DomainController } from './domain.controller';
import { DomainProvisioningService } from './domain-provisioning.service';
import { DomainGuard } from './domain.guard';

@Module({
  imports: [PrismaModule],
  providers: [DomainService, DomainProvisioningService, DomainGuard, JwtAuthGuard],
  controllers: [DomainController],
  exports: [DomainService, DomainProvisioningService, DomainGuard, JwtAuthGuard],
})
export class DomainModule {}
