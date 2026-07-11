import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';

@Module({
  imports: [PrismaModule],
  providers: [SchoolService],
  controllers: [SchoolController],
  exports: [SchoolService],
})
export class SchoolModule {}
