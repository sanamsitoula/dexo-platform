import { Module } from '@nestjs/common';
import { PrismaModule, AuditModule } from '@dexo/shared';
import { PageBuilderService } from './page-builder.service';
import { PageBuilderController } from './page-builder.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [PageBuilderService],
  controllers: [PageBuilderController],
  exports: [PageBuilderService],
})
export class PageBuilderModule {}
