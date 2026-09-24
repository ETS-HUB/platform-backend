import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Parse message content — returns structured object if JSON, null if plain text
function parseMessageContent(content: string): any {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.type) return parsed;
    return null;
  } catch {
    return null;
  }
}

function withParsed<T extends { content: string }>(message: T) {
  return { ...message, parsed: parseMessageContent(message.content) };
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(userOneId: string, userTwoId: string) {
    // Always store with smaller ID first for consistency
    const [participantOneId, participantTwoId] = [userOneId, userTwoId].sort();

    const existing = await this.prisma.conversation.findUnique({
      where: {
        participantOneId_participantTwoId: {
          participantOneId,
          participantTwoId,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { participantOneId, participantTwoId },
    });
  }

  async sendMessage(senderId: string, recipientId: string, content: string) {
    const conversation = await this.getOrCreateConversation(
      senderId,
      recipientId,
    );

    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderId, content },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    // Update last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return withParsed(message);
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participantOneId: userId }, { participantTwoId: userId }],
      },
      include: {
        participantOne: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        participantTwo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Get unread counts per conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        const otherUser =
          conv.participantOneId === userId
            ? conv.participantTwo
            : conv.participantOne;
        const lastMessage = conv.messages[0] || null;

        return {
          conversationId: conv.id,
          otherUser,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                isFromMe: lastMessage.senderId === userId,
              }
            : null,
          unreadCount,
        };
      }),
    );

    return result;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (
      conversation.participantOneId !== userId &&
      conversation.participantTwoId !== userId
    ) {
      throw new NotFoundException('Conversation not found');
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      messages: messages.reverse().map(withParsed),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMessagesWith(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.getOrCreateConversation(
      userId,
      otherUserId,
    );
    return this.getMessages(userId, conversation.id, page, limit);
  }

  async markAsRead(userId: string, conversationId: string) {
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ participantOneId: userId }, { participantTwoId: userId }],
        },
      },
    });
    return { unreadCount: count };
  }
}
