import { Module } from '@nestjs/common';
import { PrismaModule, AuditModule } from '@dexo/shared';
import { ThemeBuilderService } from './theme-builder.service';
import { ThemeBuilderController } from './theme-builder.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ThemeBuilderService],
  controllers: [ThemeBuilderController],
  exports: [ThemeBuilderService],
})
export class ThemeBuilderModule {}
