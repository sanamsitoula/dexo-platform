import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { SalonService } from './salon.service';
import { SalonController } from './salon.controller';

@Module({
  imports: [PrismaModule],
  providers: [SalonService],
  controllers: [SalonController],
  exports: [SalonService],
})
export class SalonModule {}
