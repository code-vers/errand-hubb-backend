import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { UserRole } from '@prisma/client';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.sub || req.user.id, req.user.role);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') conversationId: string, @Request() req) {
    return this.messagesService.getMessages(conversationId, req.user.sub || req.user.id);
  }

  @Post('conversations')
  startConversation(@Body() dto: StartConversationDto, @Request() req) {
    return this.messagesService.startConversation(req.user.sub || req.user.id, dto.participantId);
  }

  @Get('admin/conversations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  getAdminConversations() {
    return this.messagesService.getAdminConversations();
  }
}
