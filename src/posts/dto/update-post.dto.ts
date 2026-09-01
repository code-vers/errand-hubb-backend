import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ApiPropertyOptional({ description: 'Post status', example: 'in_progress' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Post state' })
  @IsOptional()
  @IsString()
  postState?: string;

  @ApiPropertyOptional({ description: 'Post ID' })
  @IsOptional()
  @IsString()
  id?: string;
}
