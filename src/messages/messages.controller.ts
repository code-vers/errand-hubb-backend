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
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubscriptionGuard } from '../auth/guards/subscription.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Request() req) {
    return this.messagesService.getConversations(
      req.user.sub || req.user.id,
      req.user.role,
    );
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') conversationId: string, @Request() req) {
    return this.messagesService.getMessages(
      conversationId,
      req.user.sub || req.user.id,
    );
  }

  @Post('conversations')
  @UseGuards(SubscriptionGuard)
  startConversation(@Body() dto: StartConversationDto, @Request() req) {
    return this.messagesService.startConversation(
      req.user.sub || req.user.id,
      dto.participantId,
    );
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerOptions('chat')))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/media/chat/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Get('admin/conversations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  getAdminConversations() {
    return this.messagesService.getAdminConversations();
  }
}
