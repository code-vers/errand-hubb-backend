import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UserRole } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: string, role: string) {
    const where =
      role === UserRole.client ? { clientId: userId } : { errandId: userId };

    const conversations = await this.prisma.conversation.findMany({
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
          where: {
            NOT: {
              deletedFor: { has: userId },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                isRead: false,
                NOT: {
                  deletedFor: { has: userId },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conv) => ({
      ...conv,
      unreadCount: conv._count?.messages || 0,
    }));
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.clientId !== userId && conversation.errandId !== userId) {
      throw new ForbiddenException('Not authorized to view these messages');
    }

    // Mark messages as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return this.prisma.message.findMany({
      where: {
        conversationId,
        NOT: {
          deletedFor: { has: userId },
        },
      },
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

  async markAsRead(conversationId: string, userId: string) {
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });
    return result.count > 0;
  }

  async startConversation(userId: string, participantId: string) {
    console.log(
      `SERVICE: Starting conversation between ${userId} and ${participantId}`,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
    });

    if (!user || !participant) {
      throw new NotFoundException('User or participant not found');
    }

    let clientId: string, errandId: string;

    if (user.role === UserRole.client && participant.role === UserRole.errand) {
      clientId = userId;
      errandId = participantId;
    } else if (
      user.role === UserRole.errand &&
      participant.role === UserRole.client
    ) {
      clientId = participantId;
      errandId = userId;
    } else {
      throw new ForbiddenException(
        'Conversations must be between a Client and an Errand professional',
      );
    }

    const include = {
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
        where: {
          NOT: {
            deletedFor: { has: userId },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
      _count: {
        select: {
          messages: {
            where: {
              senderId: { not: userId },
              isRead: false,
              NOT: {
                deletedFor: { has: userId },
              },
            },
          },
        },
      },
    };

    // Find or create conversation (non-service-request conversations use null serviceRequestId)
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        clientId_errandId_serviceRequestId: {
          clientId,
          errandId,
          serviceRequestId: null as unknown as string,
        },
      },
      include,
    });

    if (!conversation) {
      console.log(
        `SERVICE: Creating new conversation for ${clientId} and ${errandId}`,
      );
      conversation = await this.prisma.conversation.create({
        data: { clientId, errandId },
        include,
      });
    }

    return {
      ...conversation,
      unreadCount: (conversation as any)._count?.messages || 0,
    };
  }

  async createMessage(
    senderId: string,
    dto: CreateMessageDto & { type?: string; metadata?: any },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.clientId !== senderId &&
      conversation.errandId !== senderId
    ) {
      throw new ForbiddenException(
        'Not authorized to send message in this conversation',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: senderId,
        content: dto.content,
        type: dto.type || 'text',
        metadata: dto.metadata || {},
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
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async pinMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (
      message.conversation.clientId !== userId &&
      message.conversation.errandId !== userId
    ) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
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

  async unsendMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only unsend your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: 'This message was unsent',
        metadata: {},
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
  }

  async deleteMessageForMe(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (
      message.conversation.clientId !== userId &&
      message.conversation.errandId !== userId
    ) {
      throw new ForbiddenException('Not authorized');
    }

    const updatedDeletedFor = [...new Set([...message.deletedFor, userId])];

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedFor: updatedDeletedFor },
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

  async getAdminConversations() {
    return this.prisma.conversation.findMany({
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
    return this.prisma.conversation.findUnique({
      where: { id },
    });
  }
}
