import {
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { VisibilityStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name', example: 'Alice' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Biography description' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+15125550199' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'City location', example: 'Austin' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State location', example: 'TX' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Location address' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Time zone' })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional({ description: 'Preferred contact method', example: 'email' })
  @IsOptional()
  @IsString()
  preferredContact?: string;

  @ApiPropertyOptional({ enum: ['public', 'private'], description: 'Profile visibility status' })
  @IsOptional()
  @IsEnum(VisibilityStatus)
  visibility?: VisibilityStatus;

  @ApiPropertyOptional({ description: 'Hourly rate', example: '40.00' })
  @IsOptional()
  @IsString()
  ratePerHour?: string;

  @ApiPropertyOptional({ description: 'Services offered' })
  @IsOptional()
  @IsString()
  services?: string;

  @ApiPropertyOptional({ description: 'Primary YouTube showcase link' })
  @IsOptional()
  @IsString()
  youtubeLink?: string;

  @ApiPropertyOptional({ description: 'YouTube showcase links array' })
  @IsOptional()
  youtubeLinks?: any;

  @ApiPropertyOptional({ description: 'YouTube link 1' })
  @IsOptional()
  @IsString()
  youtubeLink1?: string;

  @ApiPropertyOptional({ description: 'YouTube link 2' })
  @IsOptional()
  @IsString()
  youtubeLink2?: string;

  @ApiPropertyOptional({ description: 'YouTube link 3' })
  @IsOptional()
  @IsString()
  youtubeLink3?: string;

  @ApiPropertyOptional({ description: 'Category IDs list or JSON array string' })
  @IsOptional()
  categoryIds?: any;

  @ApiPropertyOptional({ description: 'New gallery images (multipart file array)', type: 'array', items: { type: 'string', format: 'binary' } })
  @IsOptional()
  gallery?: any;

  @ApiPropertyOptional({ description: 'Retained existing gallery URL strings to keep' })
  @IsOptional()
  retainedGallery?: any;
}
