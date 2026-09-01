import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current existing password', example: 'oldPassword123' })
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters, uppercase, lowercase, and digit)',
    example: 'NewStrongPass123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message: 'Password must contain both uppercase and lowercase letters and at least one number',
  })
  newPassword!: string;
}
