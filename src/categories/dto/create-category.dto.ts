import { IsString, IsOptional, IsEnum } from 'class-validator';
import { IconType, CategoryStatus } from '../../generated/prisma/enums.js';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsEnum(IconType)
  @IsOptional()
  iconType?: IconType;

  @IsString()
  @IsOptional()
  color?: string;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
