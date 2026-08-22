import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters.' })
  description: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  dateNeeded?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  postState?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  youtubeLink?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
