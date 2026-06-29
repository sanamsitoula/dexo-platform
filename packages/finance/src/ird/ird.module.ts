import { Module } from '@nestjs/common';
import { IrdController } from './ird.controller';
import { IrdService } from './ird.service';
import { PrismaModule } from '@dexo/shared';
import { QueueModule } from '@dexo/shared';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [IrdController],
  providers: [IrdService],
  exports: [IrdService],
})
export class IrdModule {}
