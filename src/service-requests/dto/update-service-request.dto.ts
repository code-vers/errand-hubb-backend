import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceRequestDto } from './create-service-request.dto.js';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateServiceRequestDto extends PartialType(
  CreateServiceRequestDto,
) {
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
