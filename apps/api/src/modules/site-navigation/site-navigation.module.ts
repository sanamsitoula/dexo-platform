import { Module } from '@nestjs/common';
import { PrismaModule, AuditModule } from '@dexo/shared';
import { SiteNavigationService } from './site-navigation.service';
import { SiteNavigationController } from './site-navigation.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [SiteNavigationService],
  controllers: [SiteNavigationController],
  exports: [SiteNavigationService],
})
export class SiteNavigationModule {}
