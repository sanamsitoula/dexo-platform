import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { PrismaModule } from '@dexo/shared';
import { AuthModule } from '@dexo/auth';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ContactController],
})
export class ContactModule {}
