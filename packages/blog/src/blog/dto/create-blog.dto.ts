import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BlogStatusDto {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived',
}

export class CreateBlogDto {
  @ApiProperty({ description: 'Blog title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Blog content (Markdown or HTML)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Short excerpt/summary' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiPropertyOptional({ description: 'Blog status', enum: BlogStatusDto })
  @IsOptional()
  @IsEnum(BlogStatusDto)
  status?: BlogStatusDto;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tag IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Scheduled publish date' })
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Tenant ID (for platform admin creating tenant blog)' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
