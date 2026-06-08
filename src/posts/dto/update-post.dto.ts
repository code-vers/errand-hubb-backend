import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  id?: string;
}
