import { CategoryStatus, IconType } from '../../generated/prisma/enums.js';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

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
