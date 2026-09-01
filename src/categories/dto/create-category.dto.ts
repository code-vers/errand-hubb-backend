import { IsString, IsOptional, IsEnum } from 'class-validator';
import { IconType, CategoryStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Home Cleaning' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Residential and commercial cleaning services' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name or image URL', example: 'broom' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ enum: ['lucide', 'custom_image'], default: 'lucide', description: 'Icon rendering type' })
  @IsEnum(IconType)
  @IsOptional()
  iconType?: IconType;

  @ApiPropertyOptional({ description: 'Color hex code', example: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], default: 'active', description: 'Category status' })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
