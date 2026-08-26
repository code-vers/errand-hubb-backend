import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterErrandDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  services?: string;

  @IsString()
  @IsOptional()
  youtubeLink?: string;

  @IsOptional()
  youtubeLinks?: string[] | string;

  @IsString()
  @IsOptional()
  youtubeLink1?: string;

  @IsString()
  @IsOptional()
  youtubeLink2?: string;

  @IsString()
  @IsOptional()
  youtubeLink3?: string;

  @IsNumberString()
  @IsOptional()
  rate?: string;

  @IsOptional()
  profileImage?: any;

  @IsOptional()
  categoryIds?: string | string[];
}
