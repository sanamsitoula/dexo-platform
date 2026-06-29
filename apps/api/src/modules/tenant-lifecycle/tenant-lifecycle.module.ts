import { Module } from '@nestjs/common';
import { TenantLifecycleController } from './tenant-lifecycle.controller';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { SlugService } from './slug.service';
import { ProvisioningService } from './provisioning.service';
import { CustomDomainService } from './custom-domain.service';
import { PrismaModule } from '../../prisma.module';
import { AuditModule } from '@dexo/shared';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TenantLifecycleController],
  providers: [
    TenantLifecycleService,
    SlugService,
    ProvisioningService,
    CustomDomainService,
  ],
  exports: [
    TenantLifecycleService,
    SlugService,
    ProvisioningService,
    CustomDomainService,
  ],
})
export class TenantLifecycleModule {}
