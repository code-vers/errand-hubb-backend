import { IsString, IsNotEmpty, IsOptional, IsDecimal, IsDateString, IsUUID } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsDateString()
  dateNeeded?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
