import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset security token', example: 'd83f2a1b9c...' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password (minimum 6 characters)', example: 'newSecretPassword123' })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
