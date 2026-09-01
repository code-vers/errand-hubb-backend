import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'Errand title', example: 'Help moving furniture' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed description of the errand', example: 'Need assistance moving a heavy sofa and table to the 2nd floor.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters.' })
  description: string;

  @ApiProperty({ description: 'City location', example: 'Austin' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ description: 'State location', example: 'TX' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Budget amount string or number', example: '75' })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({ description: 'Date needed', example: '2026-09-15' })
  @IsOptional()
  @IsString()
  dateNeeded?: string;

  @ApiPropertyOptional({ description: 'Preferred time', example: '2:00 PM' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: 'Service type', example: 'Moving & Delivery' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Initial status', example: 'open' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Post state', example: 'active' })
  @IsOptional()
  @IsString()
  postState?: string;

  @ApiPropertyOptional({ description: 'Contact info or phone number', example: '512-555-0100' })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiPropertyOptional({ description: 'Optional photo URL for the errand' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Optional video showcase link' })
  @IsOptional()
  @IsString()
  youtubeLink?: string;

  @ApiProperty({ description: 'Category ID', example: 'cat-uuid-123' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
