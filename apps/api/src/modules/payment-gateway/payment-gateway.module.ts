import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
