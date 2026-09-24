import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('report/:attemptId')
  @ApiOperation({ summary: 'Generate AI skill report for an assessment attempt' })
  async generateSkillReport(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.aiService.generateSkillReport(attemptId, userId);
  }

  @Post('learning-path')
  @ApiOperation({ summary: 'Generate personalized AI learning path based on latest assessment' })
  async generateLearningPath(@CurrentUser('id') userId: string) {
    return this.aiService.generateLearningPath(userId);
  }

  @Post('cheat-sheet')
  @ApiOperation({ summary: 'Generate cheat sheet for weakest topic (or specified topic)' })
  @ApiQuery({ name: 'topic', required: false, description: 'Topic name (defaults to weakest)' })
  async generateCheatSheet(
    @CurrentUser('id') userId: string,
    @Query('topic') topic?: string,
  ) {
    return this.aiService.generateCheatSheet(userId, topic);
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Generate personalized resource recommendations' })
  async generateRecommendations(@CurrentUser('id') userId: string) {
    return this.aiService.generateResourceRecommendations(userId);
  }

  @Post('generate-all/:attemptId')
  @ApiOperation({ summary: 'Generate all AI content (report + path + cheat sheet + recommendations) after assessment' })
  async generateAll(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.aiService.generateAllPostAssessment(attemptId, userId);
  }
}
