import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceRequestDto {
  @ApiProperty({ description: 'Service request title', example: 'Plumbing leak repair' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed description of the required service', example: 'Kitchen sink pipe is leaking under the cabinet.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Category ID', example: 'cat-uuid-123' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'City location', example: 'Austin' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ description: 'State location', example: 'TX' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Offered budget amount', example: '100' })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({ description: 'Date needed', example: '2026-09-10' })
  @IsOptional()
  @IsString()
  dateNeeded?: string;

  @ApiPropertyOptional({ description: 'Preferred time', example: 'Morning (9:00 AM - 12:00 PM)' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'urgent', 'emergency'], default: 'normal', description: 'Urgency level' })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'urgent', 'emergency'])
  urgencyLevel?: string;

  @ApiPropertyOptional({ description: 'Optional image attachment URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active'], default: 'active', description: 'Initial status' })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active'])
  status?: string;
}
