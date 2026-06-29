import { Module } from '@nestjs/common';
import { BusinessTemplateController } from './business-template.controller';
import { BusinessTemplateService } from './business-template.service';
import { PrismaModule } from '../../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessTemplateController],
  providers: [BusinessTemplateService],
  exports: [BusinessTemplateService],
})
export class BusinessTemplateModule {}
