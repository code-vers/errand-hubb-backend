import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorVerifyDto {
  @ApiProperty({ description: '6-digit 2FA verification code', example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
