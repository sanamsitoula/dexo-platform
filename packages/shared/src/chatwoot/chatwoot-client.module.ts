import { Module } from '@nestjs/common';
import { ChatwootClientService } from './chatwoot-client.service';

@Module({
  providers: [ChatwootClientService],
  exports: [ChatwootClientService],
})
export class ChatwootClientModule {}
