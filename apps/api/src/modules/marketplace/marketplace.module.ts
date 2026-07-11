import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { AuthModule } from '@dexo/auth';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
