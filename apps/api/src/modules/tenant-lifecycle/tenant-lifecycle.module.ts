import { Module } from '@nestjs/common';
import { TenantLifecycleController } from './tenant-lifecycle.controller';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { SlugService } from './slug.service';
import { ProvisioningService } from './provisioning.service';
import { CustomDomainService } from './custom-domain.service';
import { PrismaModule } from '../../prisma.module';
import { AuditModule, TenantMailModule } from '@dexo/shared';
import { ChatwootModule } from '../chatwoot/chatwoot.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [PrismaModule, AuditModule, ChatwootModule, TenantMailModule, DomainModule],
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
