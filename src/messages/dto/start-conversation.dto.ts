import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartConversationDto {
  @ApiProperty({ description: 'User ID of participant to converse with', example: 'u-456' })
  @IsString()
  @IsNotEmpty()
  participantId: string;
}
