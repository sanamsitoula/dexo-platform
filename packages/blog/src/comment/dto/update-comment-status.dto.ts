import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CommentStatusDto {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SPAM = 'spam',
}

export class UpdateCommentStatusDto {
  @ApiProperty({ description: 'Comment status', enum: CommentStatusDto })
  @IsEnum(CommentStatusDto)
  status: CommentStatusDto;
}
