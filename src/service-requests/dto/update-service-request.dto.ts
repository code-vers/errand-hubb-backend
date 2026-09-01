import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceRequestDto } from './create-service-request.dto.js';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceRequestDto extends PartialType(
  CreateServiceRequestDto,
) {
  @ApiPropertyOptional({
    enum: ['draft', 'active', 'in_discussion', 'assigned', 'completed', 'cancelled', 'expired'],
    description: 'Service request lifecycle status',
    example: 'completed',
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'draft',
    'active',
    'in_discussion',
    'assigned',
    'completed',
    'cancelled',
    'expired',
  ])
  status?: string;
}
