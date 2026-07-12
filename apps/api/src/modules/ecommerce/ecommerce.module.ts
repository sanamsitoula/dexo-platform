import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { EcommerceService } from './ecommerce.service';
import { EcommerceController } from './ecommerce.controller';
import { EcommerceLedgerService } from './ecommerce-ledger.service';
import { EcommercePublicService } from './ecommerce-public.service';
import { EcommercePublicController } from './ecommerce-public.controller';

@Module({
  imports: [PrismaModule, WebhooksModule, PaymentGatewayModule],
  providers: [EcommerceService, EcommercePublicService, EcommerceLedgerService],
  controllers: [EcommerceController, EcommercePublicController],
  exports: [EcommerceService, EcommerceLedgerService],
})
export class EcommerceModule {}
