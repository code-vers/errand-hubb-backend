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

@WebSocketGateway({
  cors: {
    origin: '*',
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
      let token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split('; ');
        const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
        if (accessTokenCookie) {
          token = accessTokenCookie.split('=')[1];
        }
      }

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.id;
      
      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;
      client.data.user = payload;
      
      this.logger.log(`Client connected: ${userId} (${client.id})`);
      
      // Join a room for this user to receive personal notifications
      client.join(`user_${userId}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
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
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    client.join(`conv_${conversationId}`);
    return { status: 'joined', conversationId };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    client.leave(`conv_${conversationId}`);
    return { status: 'left', conversationId };
  }

  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe())
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateMessageDto,
  ) {
    const userId = client.data.userId;
    const message = await this.messagesService.createMessage(userId, dto);

    // Broadcast to the conversation room
    this.server.to(`conv_${dto.conversationId}`).emit('new_message', message);
    
    // Also notify the recipient if they're not in the conversation room
    const conversation = await this.messagesService.findConversation(dto.conversationId);
    const recipientId = conversation.clientId === userId ? conversation.errandId : conversation.clientId;
    
    this.server.to(`user_${recipientId}`).emit('message_notification', {
      conversationId: dto.conversationId,
      senderName: `${client.data.user.firstName} ${client.data.user.lastName}`,
      content: dto.content,
    });

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
