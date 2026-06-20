import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  dateNeeded?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'urgent', 'emergency'])
  urgencyLevel?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active'])
  status?: string;
}
