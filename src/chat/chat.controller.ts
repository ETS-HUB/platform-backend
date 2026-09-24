import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations with last message and unread count',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          conversationId: 'uuid',
          otherUser: {
            id: 'uuid',
            firstName: 'Sarah',
            lastName: 'Mitchell',
            avatar: 'https://...',
            role: 'TUTOR',
          },
          lastMessage: {
            content: 'Great job on lesson 3!',
            createdAt: '2026-07-16T...',
            isFromMe: false,
          },
          unreadCount: 2,
        },
      ],
    },
  })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'Get messages in a conversation (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        messages: [
          {
            id: 'uuid',
            conversationId: 'uuid',
            senderId: 'uuid',
            content: 'Hello!',
            isRead: true,
            createdAt: '2026-07-16T...',
            sender: {
              id: 'uuid',
              firstName: 'Alex',
              lastName: 'Johnson',
              avatar: 'https://...',
            },
          },
        ],
        pagination: { page: 1, limit: 50, total: 5, totalPages: 1 },
      },
    },
  })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      userId,
      conversationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('messages/with/:otherUserId')
  @ApiOperation({
    summary:
      'Get messages with a specific user (creates conversation if needed)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMessagesWith(
    @CurrentUser('id') userId: string,
    @Param('otherUserId') otherUserId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessagesWith(
      userId,
      otherUserId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('send')
  @ApiOperation({
    summary: 'Send a message (REST fallback — prefer WebSocket)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 'uuid',
        conversationId: 'uuid',
        senderId: 'uuid',
        content: 'Can you help with closures?',
        isRead: false,
        createdAt: '2026-07-16T...',
        sender: {
          firstName: 'Alex',
          lastName: 'Johnson',
          avatar: 'https://...',
        },
      },
    },
  })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() body: { recipientId: string; content: string },
  ) {
    return this.chatService.sendMessage(userId, body.recipientId, body.content);
  }

  @Post('read/:conversationId')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.markAsRead(userId, conversationId);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({ status: 200, schema: { example: { unreadCount: 3 } } })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.chatService.getUnreadCount(userId);
  }
}
