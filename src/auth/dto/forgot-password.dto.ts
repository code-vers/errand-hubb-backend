import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User account email to send reset instructions', example: 'alice@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
