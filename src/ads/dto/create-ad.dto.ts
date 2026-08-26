import { IsString, IsOptional, IsUrl, IsUUID, IsInt, IsBoolean } from 'class-validator';

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
}
