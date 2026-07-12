import { Module } from '@nestjs/common';
import { PrismaModule, ChatwootClientModule } from '@dexo/shared';
import { ChatwootService } from './chatwoot.service';
import { ChatwootController } from './chatwoot.controller';

@Module({
  imports: [PrismaModule, ChatwootClientModule],
  providers: [ChatwootService],
  controllers: [ChatwootController],
  exports: [ChatwootService],
})
export class ChatwootModule {}
