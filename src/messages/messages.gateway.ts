import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UsePipes, ValidationPipe, Logger, Inject, forwardRef } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service.js';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/messages',
  // Path defaults to /socket.io - Do not change this to avoid prefix issues
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: any,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`CHAT: [Handshake] ${client.id}`);

      // Token recovery
      let token = client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(/;\s*/);
        const tokenCookie = cookies.find(c => c.startsWith('access_token=') || c.startsWith('errand_token=') || c.startsWith('token='));
        if (tokenCookie) token = tokenCookie.split('=')[1];
      }

      if (!token) {
        this.logger.warn(`CHAT: [Auth Blocked] No token for ${client.id}`);
        return;
      }

      token = token.replace(/^["']|["']$/g, '').trim();

      const payload = this.jwtService.decode(token);
      if (!payload || (!payload.sub && !payload.id)) {
        this.logger.warn(`CHAT: [Payload Error] for ${client.id}`);
        return;
      }

      const userId = payload.sub || payload.id;
      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;
      client.data.user = payload;

      this.logger.log(`CHAT: [Active] User ${userId} (${client.id})`);
      await client.join(`user_${userId}`);
    } catch (error: any) {
      this.logger.error(`CHAT: [Fatal Error] ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.logger.log(`CHAT: [Offline] User ${userId}`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { status: 'pong', time: new Date().toISOString() };
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId) return { error: 'Missing ID' };
    await client.join(`conv_${conversationId}`);
    this.logger.log(`CHAT: [Room Join] ${client.data.userId} joined conv_${conversationId}`);
    return { status: 'joined', room: `conv_${conversationId}` };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId) return { error: 'Missing ID' };
    await client.leave(`conv_${conversationId}`);
    return { status: 'left' };
  }

  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateMessageDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) return { error: 'Unauthorized' };

      const conversation = await this.messagesService.findConversation(dto.conversationId);
      if (!conversation) return { error: 'Conversation not found' };

      const message = await this.messagesService.createMessage(userId, dto);
      
      // BROADCAST to the conversation room
      this.server.to(`conv_${dto.conversationId}`).emit('new_message', message);
      
      // NOTIFICATION to the recipient room
      const recipientId = conversation.clientId === userId ? conversation.errandId : conversation.clientId;
      const senderName = `${client.data.user?.firstName || 'User'}`;
      const contentPreview = dto.type === 'text' ? dto.content : `Sent a ${dto.type}`;

      // Save notification to DB
      await this.notificationsService.createNotification(recipientId, {
        type: 'new_message',
        title: `New message from ${senderName}`,
        message: contentPreview.substring(0, 100) + (contentPreview.length > 100 ? '...' : ''),
        metadata: {
          conversationId: dto.conversationId,
          senderName,
          redirectUrl: `/dashboard/messages?convId=${dto.conversationId}`,
        },
      });

      this.server.to(`user_${recipientId}`).emit('message_notification', {
        conversationId: dto.conversationId,
        senderName,
        content: contentPreview,
      });

      this.logger.log(`CHAT: [Broadcast Success] to conv_${dto.conversationId}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`CHAT: [Send Error] ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conv_${data.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!data?.conversationId || !userId) return;
    const updated = await this.messagesService.markAsRead(data.conversationId, userId);
    if (updated) {
      client.to(`conv_${data.conversationId}`).emit('messages_read', {
        conversationId: data.conversationId,
        readBy: userId,
      });
    }
  }

  @SubscribeMessage('message_action')
  async handleMessageAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { action: 'pin' | 'unsend' | 'delete_for_me'; messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    try {
      if (data.action === 'pin') {
        const message = await this.messagesService.pinMessage(data.messageId, userId);
        this.server.to(`conv_${message.conversationId}`).emit('message_updated', message);
      } else if (data.action === 'unsend') {
        const message = await this.messagesService.unsendMessage(data.messageId, userId);
        this.server.to(`conv_${message.conversationId}`).emit('message_updated', message);
      } else if (data.action === 'delete_for_me') {
        await this.messagesService.deleteMessageForMe(data.messageId, userId);
        client.emit('message_deleted', { messageId: data.messageId });
      }
    } catch (error: any) {
      this.logger.error(`CHAT: [Action Error] ${error.message}`);
    }
  }
}
