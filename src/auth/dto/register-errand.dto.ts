import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterErrandDto {
  @ApiProperty({ description: 'Provider first name', example: 'Bob' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Provider last name', example: 'Builder' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ description: 'Provider email address', example: 'bob@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Account password (minimum 6 characters)', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+15125555678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'City location', example: 'Austin' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State location', example: 'TX' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Provider biography / summary', example: 'Experienced handyman with 10+ years experience.' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'Services description', example: 'Home repair, plumbing, carpentry' })
  @IsString()
  @IsOptional()
  services?: string;

  @ApiPropertyOptional({ description: 'Primary YouTube showcase link', example: 'https://youtube.com/watch?v=123' })
  @IsString()
  @IsOptional()
  youtubeLink?: string;

  @ApiPropertyOptional({ description: 'Additional YouTube showcase links', type: [String] })
  @IsOptional()
  youtubeLinks?: string[] | string;

  @ApiPropertyOptional({ description: 'YouTube Link 1' })
  @IsString()
  @IsOptional()
  youtubeLink1?: string;

  @ApiPropertyOptional({ description: 'YouTube Link 2' })
  @IsString()
  @IsOptional()
  youtubeLink2?: string;

  @ApiPropertyOptional({ description: 'YouTube Link 3' })
  @IsString()
  @IsOptional()
  youtubeLink3?: string;

  @ApiPropertyOptional({ description: 'Hourly or flat rate', example: '35.00' })
  @IsNumberString()
  @IsOptional()
  rate?: string;

  @ApiPropertyOptional({ description: 'Profile avatar image file', type: 'string', format: 'binary' })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({ description: 'Category IDs offering services for', example: ['cat-id-1', 'cat-id-2'] })
  @IsOptional()
  categoryIds?: string | string[];
}
