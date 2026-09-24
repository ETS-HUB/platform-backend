import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get overview stats (total students, assessments, completion rate)' })
  async getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('score-distribution')
  @ApiOperation({ summary: 'Get score distribution across all completed assessments' })
  async getScoreDistribution() {
    return this.analyticsService.getScoreDistribution();
  }

  @Get('topic-performance')
  @ApiOperation({ summary: 'Get average performance per topic (sorted worst to best)' })
  async getTopicPerformance() {
    return this.analyticsService.getTopicPerformance();
  }

  @Get('skill-gaps')
  @ApiOperation({ summary: 'Get topics where students struggle most (below 60% avg)' })
  async getSkillGaps() {
    return this.analyticsService.getSkillGaps();
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent assessment completions' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records (default: 20)' })
  async getRecentActivity(@Query('limit') limit?: string) {
    return this.analyticsService.getRecentActivity(
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('goal-distribution')
  @ApiOperation({ summary: 'Get distribution of student career goals' })
  async getGoalDistribution() {
    return this.analyticsService.getGoalDistribution();
  }

  @Get('experience-levels')
  @ApiOperation({ summary: 'Get distribution of student experience levels' })
  async getExperienceLevels() {
    return this.analyticsService.getExperienceLevelDistribution();
  }
}
