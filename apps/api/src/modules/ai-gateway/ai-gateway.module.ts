import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { AiGatewayController } from './ai-gateway.controller';

/**
 * AiPlatformModule (the registries/runtime) is @Global(), so it doesn't
 * need to be imported here — this module just adds the HTTP surface.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AiGatewayController],
})
export class AiGatewayModule {}
