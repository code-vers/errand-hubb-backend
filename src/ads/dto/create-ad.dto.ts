import { IsString, IsOptional, IsUrl, IsUUID, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { AdStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdDto {
  @ApiProperty({ description: 'Ad title', example: 'Fast Delivery in Austin' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Company / Business Name', example: 'Express Logistics' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Detailed ad description', example: 'Same-day citywide courier and delivery.' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Category UUID', example: 'cat-uuid-123' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Subcategory UUID' })
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiPropertyOptional({ description: 'Location / City', example: 'Austin, TX' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Contact information / Phone', example: 'contact@express.com' })
  @IsString()
  @IsOptional()
  contactInfo?: string;

  @ApiPropertyOptional({ description: 'Video promotion link' })
  @IsUrl()
  @IsOptional()
  youtubeLink?: string;

  @ApiPropertyOptional({ description: 'Ad banner image URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Ad display position order index', example: 1 })
  @IsInt()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Whether the ad is featured', default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending', description: 'Ad approval status' })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;
}
