import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsArray,
  IsObject,
} from 'class-validator';

export class CreateMarketplaceItemDto {
  @IsIn(['template', 'plugin'])
  type: 'template' | 'plugin';

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  domainType?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  screenshots?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}

export class UpdateMarketplaceItemDto {
  @IsOptional()
  @IsIn(['template', 'plugin'])
  type?: 'template' | 'plugin';

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  domainType?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  screenshots?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
