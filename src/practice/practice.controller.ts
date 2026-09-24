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
import { PracticeService } from './practice.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Practice')
@ApiBearerAuth()
@Controller('practice')
@UseGuards(JwtAuthGuard)
export class PracticeController {
  constructor(private practiceService: PracticeService) {}

  @Get('topics')
  @ApiOperation({
    summary: 'Get topics available for practice with recommended priority',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'JavaScript Fundamentals',
          _count: { questions: 7 },
          recommendedPriority: 'high',
          lastScore: 60,
        },
        {
          id: 'uuid',
          name: 'React Essentials',
          _count: { questions: 7 },
          recommendedPriority: 'high',
          lastScore: 33,
        },
      ],
    },
  })
  async getTopicsForPractice(@CurrentUser('id') userId: string) {
    return this.practiceService.getTopicsForPractice(userId);
  }

  @Post('start/:topicId')
  @ApiOperation({ summary: 'Start a practice session for a topic' })
  @ApiQuery({
    name: 'count',
    required: false,
    description: 'Number of questions (default: 10)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        sessionId: 'uuid',
        topic: 'JavaScript Fundamentals',
        totalQuestions: 5,
        questions: [
          {
            id: 'uuid',
            text: 'What does === do?',
            options: [
              { id: 'a', text: 'Assigns value' },
              { id: 'b', text: 'Checks value and type' },
              { id: 'c', text: 'Checks only value' },
              { id: 'd', text: 'Compares strings' },
            ],
            difficulty: 'EASY',
          },
        ],
      },
    },
  })
  async startSession(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
    @Query('count') count?: string,
  ) {
    return this.practiceService.startPracticeSession(
      userId,
      topicId,
      count ? parseInt(count) : 10,
    );
  }

  @Post('answer/:questionId')
  @ApiOperation({
    summary: 'Submit a practice answer (returns correct answer + explanation)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        isCorrect: true,
        correctAnswer: 'b',
        explanation:
          '=== checks both value AND type, unlike == which only checks value.',
        points: 10,
      },
    },
  })
  async submitAnswer(
    @Param('questionId') questionId: string,
    @Body('selectedOption') selectedOption: string,
  ) {
    return this.practiceService.submitPracticeAnswer(
      questionId,
      selectedOption,
    );
  }

  @Post('complete/:sessionId')
  @ApiOperation({ summary: 'Complete a practice session and earn XP' })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        sessionId: 'uuid',
        totalQuestions: 5,
        correctAnswers: 4,
        percentage: 80,
        xpEarned: 18,
      },
    },
  })
  async completeSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
    @Body('correctAnswers') correctAnswers: number,
  ) {
    return this.practiceService.completePracticeSession(
      sessionId,
      userId,
      correctAnswers,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get practice session history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        sessions: [
          {
            id: 'uuid',
            topicId: 'uuid',
            totalQuestions: 10,
            correctAnswers: 8,
            completedAt: '2026-07-16T...',
          },
        ],
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      },
    },
  })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.practiceService.getPracticeHistory(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('progress/:topicId')
  @ApiOperation({
    summary: 'Get practice progress over time for a specific topic',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        totalSessions: 3,
        progress: [
          { date: '2026-07-11T...', percentage: 50 },
          { date: '2026-07-14T...', percentage: 60 },
          { date: '2026-07-16T...', percentage: 80 },
        ],
      },
    },
  })
  async getTopicProgress(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.practiceService.getTopicProgress(userId, topicId);
  }
}
