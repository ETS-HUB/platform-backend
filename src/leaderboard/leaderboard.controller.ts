import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('xp')
  @ApiOperation({ summary: 'Top students by XP earned' })
  @ApiQuery({
    name: 'track',
    required: false,
    description: 'Filter by track slug (frontend, backend, etc.)',
  })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          rank: 1,
          userId: 'uuid',
          firstName: 'Alex',
          lastName: 'Johnson',
          avatar: 'https://...',
          xp: 566,
          level: 1,
          trackSlug: 'frontend',
        },
        { rank: 2, firstName: 'Mike', xp: 289, level: 1 },
      ],
    },
  })
  async xpLeaderboard(
    @Query('track') track?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getXpLeaderboard(
      track,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('lessons')
  @ApiOperation({ summary: 'Top students by lessons completed' })
  @ApiQuery({ name: 'track', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          rank: 1,
          firstName: 'Alex',
          lastName: 'Johnson',
          lessonsCompleted: 9,
          trackSlug: 'frontend',
        },
      ],
    },
  })
  async lessonsLeaderboard(
    @Query('track') track?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getLessonsLeaderboard(
      track,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('assessment')
  @ApiOperation({ summary: 'Top students by average assessment score' })
  @ApiQuery({ name: 'track', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          rank: 1,
          firstName: 'Alex',
          lastName: 'Johnson',
          avgScore: 68,
          totalAttempts: 1,
          trackSlug: 'frontend',
        },
      ],
    },
  })
  async assessmentLeaderboard(
    @Query('track') track?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getAssessmentLeaderboard(
      track,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('my-rank')
  @ApiOperation({
    summary: 'Get my rank + top 10 + surrounding students (shows where I am)',
  })
  @ApiQuery({
    name: 'category',
    required: true,
    enum: ['xp', 'lessons', 'assessment'],
  })
  @ApiQuery({ name: 'track', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        myRank: 1,
        myEntry: { rank: 1, firstName: 'Alex', xp: 566 },
        top10: [{ rank: 1, firstName: 'Alex', xp: 566 }],
        surrounding: [],
        totalParticipants: 9,
      },
    },
  })
  async myRank(
    @CurrentUser('id') userId: string,
    @Query('category') category: string,
    @Query('track') track?: string,
  ) {
    return this.leaderboardService.getMyRank(userId, category, track);
  }
}
