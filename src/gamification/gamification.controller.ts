import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private gamificationService: GamificationService) {}

  @Get('badges')
  @ApiOperation({ summary: 'Get current user badges' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'HTML Expert',
          description: 'Scored 75%+ in HTML',
          icon: '🌐',
          earnedAt: '2026-07-16T...',
        },
      ],
    },
  })
  async getMyBadges(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUserBadges(userId);
  }

  @Get('level')
  @ApiOperation({ summary: 'Get current user level and XP progress' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        xp: 566,
        level: 1,
        levelName: 'Explorer',
        nextLevel: {
          level: 10,
          name: 'Builder',
          xpRequired: 500,
          xpRemaining: 0,
          progress: 100,
        },
      },
    },
  })
  async getMyLevel(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUserLevel(userId);
  }

  @Get('available-badges')
  @ApiOperation({ summary: 'List all available badge definitions' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'React Pro',
          icon: '⚛️',
          description: 'Scored above 75% in React',
          criteria: { type: 'quiz_score', topic: 'React', minScore: 75 },
          isActive: true,
        },
      ],
    },
  })
  async getAvailableBadges() {
    return this.gamificationService.getAvailableBadges();
  }

  @Get('badge-definitions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'List all badge definitions with pagination (Admin)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getBadgeDefinitions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gamificationService.getBadgeDefinitions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('badge-definitions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a badge definition (Admin)' })
  async createBadgeDefinition(
    @Body()
    data: {
      name: string;
      description?: string;
      imageUrl?: string;
      criteria: any;
    },
  ) {
    return this.gamificationService.createBadgeDefinition(data);
  }

  @Patch('badge-definitions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a badge definition (Admin)' })
  async updateBadgeDefinition(@Param('id') id: string, @Body() data: any) {
    return this.gamificationService.updateBadgeDefinition(id, data);
  }

  @Delete('badge-definitions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a badge definition (Admin)' })
  async deleteBadgeDefinition(@Param('id') id: string) {
    return this.gamificationService.deleteBadgeDefinition(id);
  }

  @Post('check-badges/:attemptId')
  @ApiOperation({ summary: 'Check and award badges after assessment' })
  @ApiResponse({
    status: 201,
    schema: {
      example: [
        {
          name: 'Quick Learner',
          description: 'Scored above 70% on assessment',
          icon: '⚡',
          profileId: 'uuid',
        },
      ],
    },
  })
  async checkBadges(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.gamificationService.checkAndAwardBadges(userId, attemptId);
  }

  @Get('certificate/:attemptId')
  @ApiOperation({
    summary:
      'Generate shareable certificate/skill card data for an assessment attempt',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        certificate: {
          id: 'ETS-JAVA-A1B2',
          studentName: 'Alex Johnson',
          assessmentName: 'Frontend Developer Assessment',
          overallScore: 68,
          percentile: 30,
          level: 1,
          levelName: 'Explorer',
          xp: 566,
          strengths: [{ topic: 'HTML', score: 100 }],
          badges: [{ name: 'HTML Expert', icon: '🌐' }],
          shareCard: {
            title: 'Alex Johnson - Skill Assessment',
            subtitle: 'Scored 68% | Top 70% of candidates',
          },
        },
      },
    },
  })
  async getCertificate(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.gamificationService.generateCertificate(userId, attemptId);
  }
}
