import { PartialType } from '@nestjs/mapped-types';
import { CreateAdDto } from './create-ad.dto.js';
import { IsOptional, IsEnum } from 'class-validator';
import { AdStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'expired'], description: 'Ad approval status' })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;
}
