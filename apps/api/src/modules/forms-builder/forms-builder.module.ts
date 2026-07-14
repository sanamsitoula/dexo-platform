import { Module } from '@nestjs/common';
import { PrismaModule, AuditModule } from '@dexo/shared';
import { FormsBuilderService } from './forms-builder.service';
import { FormsBuilderController } from './forms-builder.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [FormsBuilderService],
  controllers: [FormsBuilderController],
  exports: [FormsBuilderService],
})
export class FormsBuilderModule {}
