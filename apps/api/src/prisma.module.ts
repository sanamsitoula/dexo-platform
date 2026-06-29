import { Module, Global } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
