import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { EcommerceService } from './ecommerce.service';
import { EcommerceController } from './ecommerce.controller';
import { EcommerceLedgerService } from './ecommerce-ledger.service';
import { EcommercePublicService } from './ecommerce-public.service';
import { EcommercePublicController } from './ecommerce-public.controller';
import { AdminEcommerceController } from './admin-ecommerce.controller';

@Module({
  imports: [PrismaModule, WebhooksModule, PaymentGatewayModule],
  providers: [EcommerceService, EcommercePublicService, EcommerceLedgerService],
  controllers: [EcommerceController, EcommercePublicController, AdminEcommerceController],
  exports: [EcommerceService, EcommerceLedgerService],
})
export class EcommerceModule {}
