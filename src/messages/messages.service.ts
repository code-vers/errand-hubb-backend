import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UserRole } from '../generated/prisma/enums.js';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: string, role: string) {
    const where = role === UserRole.client 
      ? { clientId: userId } 
      : { errandId: userId };

    return (this.prisma as any).conversation.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        errand: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await (this.prisma as any).conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.clientId !== userId && conversation.errandId !== userId) {
      throw new ForbiddenException('Not authorized to view these messages');
    }

    // Mark messages as read
    await (this.prisma as any).message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return (this.prisma as any).message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });
  }

  async startConversation(userId: string, participantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const participant = await this.prisma.user.findUnique({ where: { id: participantId } });

    if (!user || !participant) {
      throw new NotFoundException('User or participant not found');
    }

    let clientId, errandId;

    if (user.role === UserRole.client && participant.role === UserRole.errand) {
      clientId = userId;
      errandId = participantId;
    } else if (user.role === UserRole.errand && participant.role === UserRole.client) {
      clientId = participantId;
      errandId = userId;
    } else {
      throw new ForbiddenException('Conversations must be between a Client and an Errand professional');
    }

    // Find or create conversation
    let conversation = await (this.prisma as any).conversation.findUnique({
      where: {
        clientId_errandId: { clientId, errandId },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        errand: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      conversation = await (this.prisma as any).conversation.create({
        data: { clientId, errandId },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              role: true,
            },
          },
          errand: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              role: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    return conversation;
  }

  async createMessage(senderId: string, dto: CreateMessageDto) {
    const conversation = await (this.prisma as any).conversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.clientId !== senderId && conversation.errandId !== senderId) {
      throw new ForbiddenException('Not authorized to send message in this conversation');
    }

    const message = await (this.prisma as any).message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: senderId,
        content: dto.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Update conversation's updatedAt
    await (this.prisma as any).conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getAdminConversations() {
    return (this.prisma as any).conversation.findMany({
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        errand: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findConversation(id: string) {
    return (this.prisma as any).conversation.findUnique({
      where: { id },
    });
  }
}
