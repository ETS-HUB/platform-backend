import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import {
  CreateQuestionDto,
  CreateTopicDto,
  SubmitAnswerDto,
  CreateAssessmentConfigDto,
  BulkUploadQuestionsDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Assessment')
@Controller('assessment')
export class AssessmentController {
  constructor(private assessmentService: AssessmentService) {}

  @Post('topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new topic/course (Admin only)' })
  async createTopic(@Body() dto: CreateTopicDto) {
    return this.assessmentService.createTopic(dto);
  }

  @Get('topics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all topics with question counts' })
  async getTopics() {
    return this.assessmentService.getAllTopics();
  }

  @Patch('topics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update a topic/course (name, imageUrl, isSequential, minQuizScore, etc.) (Admin only)',
  })
  async updateTopic(@Param('id') id: string, @Body() data: any) {
    return this.assessmentService.updateTopic(id, data);
  }

  @Delete('topics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a topic/course (Admin only)' })
  async deleteTopic(@Param('id') id: string) {
    return this.assessmentService.deleteTopic(id);
  }

  // ============== QUESTIONS (Admin) ==============

  @Post('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question (Admin only)' })
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.assessmentService.createQuestion(dto);
  }

  @Post('questions/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk upload questions (Admin only)' })
  async bulkUpload(@Body() dto: BulkUploadQuestionsDto) {
    return this.assessmentService.bulkUploadQuestions(dto);
  }

  @Get('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all questions with pagination and filters (Admin only)',
  })
  @ApiQuery({ name: 'topicId', required: false })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ['EASY', 'MEDIUM', 'HARD'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50)',
  })
  async getQuestions(
    @Query('topicId') topicId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assessmentService.getQuestions({
      topicId,
      difficulty,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Patch('questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question (Admin only)' })
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: Partial<CreateQuestionDto>,
  ) {
    return this.assessmentService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a question (Admin only)' })
  async deleteQuestion(@Param('id') id: string) {
    return this.assessmentService.deleteQuestion(id);
  }

  // ============== ASSESSMENT CONFIGS (Admin) ==============

  @Post('configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an assessment configuration (Admin only)' })
  async createConfig(@Body() dto: CreateAssessmentConfigDto) {
    return this.assessmentService.createConfig(dto);
  }

  @Get('configs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all active assessment configs (optionally filter by track)',
  })
  @ApiQuery({
    name: 'track',
    required: false,
    description: 'Filter by track (e.g., frontend, backend, cybersecurity)',
  })
  async getConfigs(@Query('track') track?: string) {
    return this.assessmentService.getConfigs(track);
  }

  @Patch('configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an assessment config (Admin only)' })
  async updateConfig(@Param('id') id: string, @Body() data: any) {
    return this.assessmentService.updateConfig(id, data);
  }

  @Delete('configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an assessment config (Admin only)' })
  async deleteConfig(@Param('id') id: string) {
    return this.assessmentService.deleteConfig(id);
  }

  // ============== TAKING ASSESSMENT (Student) ==============

  @Post('start/:configId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start an assessment attempt' })
  async startAssessment(
    @CurrentUser('id') userId: string,
    @Param('configId') configId: string,
  ) {
    return this.assessmentService.startAssessment(userId, configId);
  }

  @Post('attempt/:attemptId/answer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit an answer for a question in an active attempt',
  })
  async submitAnswer(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.assessmentService.submitAnswer(attemptId, userId, dto);
  }

  @Post('attempt/:attemptId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete an assessment attempt and calculate scores',
  })
  async completeAssessment(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.assessmentService.completeAssessment(attemptId, userId);
  }

  @Get('attempt/:attemptId/results')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed results for a completed attempt' })
  async getResults(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.assessmentService.getAttemptResults(attemptId, userId);
  }

  @Get('attempt/:attemptId/percentile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get percentile ranking for an attempt' })
  async getPercentile(
    @CurrentUser('id') userId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.assessmentService.getPercentile(userId, attemptId);
  }

  @Get('my-attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all completed assessment attempts for current user',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyAttempts(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assessmentService.getUserAttempts(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
