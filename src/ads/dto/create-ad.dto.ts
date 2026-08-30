import { IsString, IsOptional, IsUrl, IsUUID, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { AdStatus } from '@prisma/client';

export class CreateAdDto {
  @IsString()
  title: string;

  @IsString()
  companyName: string;

  @IsString()
  description: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @IsUrl()
  @IsOptional()
  youtubeLink?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;
}
