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
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { config } from '../config/config.js';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.debug(`Connection attempt from: ${client.id}`);
      
      let token = client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token && client.handshake.headers.cookie) {
        // More robust cookie parsing
        const cookieHeader = client.handshake.headers.cookie;
        const cookies = cookieHeader.split(/;\s*/);
        const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
        if (accessTokenCookie) {
          token = accessTokenCookie.substring('access_token='.length);
        }
      }

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Explicitly provide secret to verifyAsync to avoid "secret or public key must be provided" error
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.JWT_SECRET,
      });
      
      const userId = payload.sub || payload.id;
      
      if (!userId) {
        this.logger.warn(`Connection rejected: Invalid token payload for client ${client.id}`);
        client.disconnect();
        return;
      }

      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;
      client.data.user = payload;
      
      this.logger.log(`Client connected: ${userId} (${client.id})`);
      
      // Join a room for this user to receive personal notifications
      await client.join(`user_${userId}`);
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.logger.log(`Client disconnected: ${userId} (${client.id})`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId) return { error: 'Conversation ID is required' };
    
    await client.join(`conv_${conversationId}`);
    this.logger.debug(`User ${client.data.userId} joined conversation: ${conversationId}`);
    return { status: 'joined', conversationId };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId) return { error: 'Conversation ID is required' };
    
    await client.leave(`conv_${conversationId}`);
    this.logger.debug(`User ${client.data.userId} left conversation: ${conversationId}`);
    return { status: 'left', conversationId };
  }

  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe())
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateMessageDto & { type?: string; metadata?: any },
  ) {
    const userId = client.data.userId;
    this.logger.debug(`Message from ${userId} to conversation ${dto.conversationId} of type ${dto.type || 'text'}`);
    
    const message = await this.messagesService.createMessage(userId, dto);

    // Broadcast to the conversation room (including the sender)
    this.server.to(`conv_${dto.conversationId}`).emit('new_message', message);
    
    // Also notify the recipient if they're not in the conversation room
    const conversation = await this.messagesService.findConversation(dto.conversationId);
    if (conversation) {
      const recipientId = conversation.clientId === userId ? conversation.errandId : conversation.clientId;
      
      this.server.to(`user_${recipientId}`).emit('message_notification', {
        conversationId: dto.conversationId,
        senderName: `${client.data.user.firstName || 'Someone'} ${client.data.user.lastName || ''}`,
        content: dto.type === 'text' ? dto.content : `Sent a ${dto.type}`,
        type: dto.type || 'text',
      });
    }

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    client.to(`conv_${data.conversationId}`).emit('user_typing', {
      userId,
      isTyping: data.isTyping,
    });
  }
}
