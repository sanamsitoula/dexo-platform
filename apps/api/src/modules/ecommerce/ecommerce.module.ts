import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { EcommerceService } from './ecommerce.service';
import { EcommerceController } from './ecommerce.controller';
import { EcommercePublicService } from './ecommerce-public.service';
import { EcommercePublicController } from './ecommerce-public.controller';

@Module({
  imports: [PrismaModule, WebhooksModule],
  providers: [EcommerceService, EcommercePublicService],
  controllers: [EcommerceController, EcommercePublicController],
  exports: [EcommerceService],
})
export class EcommerceModule {}
