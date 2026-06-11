import { IsString, IsOptional, IsEnum, IsNumber, IsDecimal } from 'class-validator';
import { VisibilityStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  preferredContact?: string;

  @IsOptional()
  @IsEnum(VisibilityStatus)
  visibility?: VisibilityStatus;

  @IsOptional()
  @IsString()
  ratePerHour?: string; // Passed as string from form-data often

  @IsOptional()
  @IsString()
  services?: string;
}
