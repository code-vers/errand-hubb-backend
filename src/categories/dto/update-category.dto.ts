import { CategoryStatus, IconType } from '@prisma/client';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', example: 'Home Cleaning' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name or image URL' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ enum: ['lucide', 'custom_image'], description: 'Icon rendering type' })
  @IsEnum(IconType)
  @IsOptional()
  iconType?: IconType;

  @ApiPropertyOptional({ description: 'Color hex code', example: '#10B981' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], description: 'Category status' })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
