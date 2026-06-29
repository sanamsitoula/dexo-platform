import { Module } from '@nestjs/common';
import { MobileAppController } from './mobile-app.controller';
import { PrismaModule } from '@dexo/shared';

@Module({
  imports: [PrismaModule],
  controllers: [MobileAppController],
})
export class MobileAppModule {}
