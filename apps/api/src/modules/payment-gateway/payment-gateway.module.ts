import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { StripeConnectService } from './stripe-connect.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService, StripeConnectService],
  exports: [PaymentGatewayService, StripeConnectService],
})
export class PaymentGatewayModule {}
