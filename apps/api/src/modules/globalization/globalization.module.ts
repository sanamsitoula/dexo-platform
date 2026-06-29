import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { GlobalizationController } from './globalization.controller';
import { GlobalizationService } from './globalization.service';

@Module({
  imports: [PrismaModule],
  controllers: [GlobalizationController],
  providers: [GlobalizationService],
  exports: [GlobalizationService],
})
export class GlobalizationModule {}
