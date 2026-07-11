import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ChannelConfigController } from './channel-config.controller';
import { ChannelConfigService } from './channel-config.service';
import { PrismaModule } from '@dexo/shared';
import { AuthModule } from '@dexo/auth';

@Module({
  imports: [PrismaModule, AuthModule],
  // ChannelConfigController first so GET /contact/channels isn't swallowed by GET /contact/:id.
  controllers: [ChannelConfigController, ContactController],
  providers: [ChannelConfigService],
})
export class ContactModule {}
