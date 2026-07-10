import { Module } from '@nestjs/common';
import { TenantMailModule as SharedTenantMailModule } from '@dexo/shared';
import { TenantMailController } from './tenant-mail.controller';

@Module({
  imports: [SharedTenantMailModule],
  controllers: [TenantMailController],
})
export class TenantMailApiModule {}
