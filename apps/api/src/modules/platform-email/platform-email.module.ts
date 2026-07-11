import { Module, OnModuleInit } from '@nestjs/common';
import { TenantMailModule, TenantMailService } from '@dexo/shared';
import { PlatformEmailController } from './platform-email.controller';

@Module({
  imports: [TenantMailModule],
  controllers: [PlatformEmailController],
})
export class PlatformEmailModule implements OnModuleInit {
  constructor(private mail: TenantMailService) {}

  /** Seeds PlatformEmailConfig from GLOBAL_SMTP_* env vars on first boot only. */
  async onModuleInit() {
    await this.mail.bootstrapGlobalConfigFromEnv().catch(() => {});
  }
}
