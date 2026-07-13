import { Module } from '@nestjs/common';
import { PrismaModule, AuditModule } from '@dexo/shared';
import { MenuBuilderService } from './menu-builder.service';
import { MenuBuilderController } from './menu-builder.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [MenuBuilderService],
  controllers: [MenuBuilderController],
  exports: [MenuBuilderService],
})
export class MenuBuilderModule {}
