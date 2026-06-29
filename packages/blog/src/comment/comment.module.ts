import { Module } from '@nestjs/common';
import { CommentController, CommentModerationController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaModule } from '@dexo/shared';
import { AuthModule } from '@dexo/auth';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommentController, CommentModerationController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
