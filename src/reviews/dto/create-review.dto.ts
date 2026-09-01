import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'User ID of the user being reviewed', example: 'u-uuid-123' })
  @IsString()
  @IsNotEmpty()
  revieweeId: string;

  @ApiProperty({ description: 'Rating score from 1 to 5', minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Review feedback / testimonial message', example: 'Excellent job, on time and very thorough.' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({ description: 'Completed Errand Post ID' })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({ description: 'Completed Direct Service Request ID' })
  @IsOptional()
  @IsString()
  serviceRequestId?: string;
}
