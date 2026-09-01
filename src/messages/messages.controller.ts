import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubscriptionGuard } from '../auth/guards/subscription.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get list of conversations for current authenticated user' })
  @ApiResponse({ status: 200, description: 'User conversation list' })
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(
      req.user.sub || req.user.id,
      req.user.role,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get all messages inside a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  getMessages(@Param('id') conversationId: string, @Request() req: any) {
    return this.messagesService.getMessages(
      conversationId,
      req.user.sub || req.user.id,
    );
  }

  @Post('conversations')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({ summary: 'Start a conversation with another user (Requires subscription if errander)' })
  @ApiResponse({ status: 201, description: 'Conversation created or retrieved' })
  startConversation(@Body() dto: StartConversationDto, @Request() req: any) {
    return this.messagesService.startConversation(
      req.user.sub || req.user.id,
      dto.participantId,
    );
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerOptions('chat')))
  @ApiOperation({ summary: 'Upload file attachment for chat' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded: { url, mimetype, size }' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded or file failed validation.',
      );
    }
    return {
      url: `/media/chat/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Get('admin/conversations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] List all platform conversations' })
  @ApiResponse({ status: 200, description: 'All conversations' })
  getAdminConversations() {
    return this.messagesService.getAdminConversations();
  }

  @Get('admin/conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] View messages in any conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Messages list' })
  getAdminMessages(@Param('id') conversationId: string) {
    return this.messagesService.getAdminMessages(conversationId);
  }

  @Get('admin/schedules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] View all message schedules' })
  @ApiResponse({ status: 200, description: 'Schedules list' })
  getAdminSchedules() {
    return this.messagesService.getAdminSchedules();
  }
}
