import { PartialType } from '@nestjs/mapped-types';
import { CreateAdDto } from './create-ad.dto.js';
import { IsOptional, IsEnum } from 'class-validator';
import { AdStatus } from '@prisma/client';

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;
}
