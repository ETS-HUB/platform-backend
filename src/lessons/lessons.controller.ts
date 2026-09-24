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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  // ============== ADMIN: Manage Lessons ==============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a lesson with content blocks and questions (Admin)',
  })
  async createLesson(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.createLesson(dto, userId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all lessons with filters (Admin)' })
  @ApiQuery({ name: 'topicId', required: false })
  @ApiQuery({ name: 'isPublished', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllLessons(
    @Query('topicId') topicId?: string,
    @Query('isPublished') isPublished?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lessonsService.getAllLessons({
      topicId,
      isPublished:
        isPublished !== undefined ? isPublished === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('admin/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get full lesson detail for admin/tutor — includes all blocks, questions with correct answers, no lock check',
  })
  async getAdminLessonDetail(@Param('lessonId') lessonId: string) {
    return this.lessonsService.getAdminLessonDetail(lessonId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson (Admin)' })
  async updateLesson(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLessonDto>,
  ) {
    return this.lessonsService.updateLesson(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lesson (Admin)' })
  async deleteLesson(@Param('id') id: string) {
    return this.lessonsService.deleteLesson(id);
  }

  @Post(':lessonId/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a content block to a lesson (Admin)' })
  async addContentBlock(
    @Param('lessonId') lessonId: string,
    @Body() block: any,
  ) {
    return this.lessonsService.addContentBlock(lessonId, block);
  }

  @Patch('content/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a content block (Admin)' })
  async updateContentBlock(
    @Param('blockId') blockId: string,
    @Body() data: any,
  ) {
    return this.lessonsService.updateContentBlock(blockId, data);
  }

  @Delete('content/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a content block (Admin)' })
  async deleteContentBlock(@Param('blockId') blockId: string) {
    return this.lessonsService.deleteContentBlock(blockId);
  }

  @Post(':lessonId/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a question to a lesson (Admin)' })
  async addQuestion(
    @Param('lessonId') lessonId: string,
    @Body() question: any,
  ) {
    return this.lessonsService.addLessonQuestion(lessonId, question);
  }

  @Delete('questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lesson question (Admin)' })
  async deleteQuestion(@Param('questionId') questionId: string) {
    return this.lessonsService.deleteLessonQuestion(questionId);
  }

  @Patch('questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson question (Admin)' })
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() data: any,
  ) {
    return this.lessonsService.updateLessonQuestion(questionId, data);
  }

  // ============== TOPICS: Hierarchy & Enrollment ==============

  @Get('topics/categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all categories (lightweight — for filter tabs/dropdowns)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'Programming',
          icon: '💻',
          description: 'Learn to code',
          _count: { children: 5 },
        },
        {
          id: 'uuid',
          name: 'Design',
          icon: '🎨',
          description: 'UI/UX design',
          _count: { children: 2 },
        },
      ],
    },
  })
  async getCategories() {
    return this.lessonsService.getCategories();
  }

  @Get('topics/hierarchy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get topics organized in parent-child hierarchy (with enrollment status and progress)',
  })
  @ApiQuery({
    name: 'track',
    required: false,
    description: 'Filter courses by track',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        categories: [
          {
            id: 'uuid',
            name: 'Programming',
            icon: '💻',
            children: [
              {
                id: 'uuid',
                name: 'JavaScript Fundamentals',
                icon: '🟨',
                track: 'frontend',
                _count: { lessons: 9, enrollments: 9 },
                isEnrolled: true,
                progress: {
                  completedLessons: 9,
                  totalLessons: 9,
                  percentage: 100,
                },
              },
            ],
          },
        ],
        pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
      },
    },
  })
  async getTopicsHierarchy(
    @CurrentUser('id') userId: string,
    @Query('track') track?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lessonsService.getTopicsWithHierarchy(
      track,
      userId,
      category,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('topics/:topicId/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a topic/module' })
  async enrollInTopic(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.lessonsService.enrollInTopic(userId, topicId);
  }

  @Delete('topics/:topicId/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unenroll from a topic' })
  async unenrollFromTopic(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.lessonsService.unenrollFromTopic(userId, topicId);
  }

  @Get('topics/:topicId/students')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get students enrolled in a topic (with avatar and username)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTopicStudents(
    @Param('topicId') topicId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lessonsService.getTopicEnrolledStudents(
      topicId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('topics/:topicId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my progress for a specific topic (lesson-by-lesson)',
  })
  async getTopicProgress(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.lessonsService.getTopicProgress(userId, topicId);
  }

  @Get('topics/:topicId/students/:studentId/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get a specific student's lesson-by-lesson progress for a course (Tutor/Admin)",
  })
  async getStudentTopicProgress(
    @Param('topicId') topicId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.lessonsService.getTopicProgress(studentId, topicId);
  }

  // ============== STUDENT: Learn ==============

  @Get('topic/:topicId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all lessons for a topic (ordered, with progress)',
  })
  async getTopicLessons(
    @Param('topicId') topicId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.lessonsService.getTopicLessons(topicId, userId);
  }

  @Get('my/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my learning progress across all enrolled topics',
  })
  async getMyProgress(@CurrentUser('id') userId: string) {
    return this.lessonsService.getMyProgress(userId);
  }

  // ============== BOOKMARKS (must be before :lessonId) ==============

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookmarked courses' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          courseId: 'uuid',
          courseName: 'React Essentials',
          courseIcon: '⚛️',
          category: 'Programming',
          totalLessons: 10,
          totalEnrolled: 9,
          bookmarkedAt: '2026-07-16T...',
        },
      ],
    },
  })
  async getBookmarks(@CurrentUser('id') userId: string) {
    return this.lessonsService.getBookmarkedCourses(userId);
  }

  @Post('bookmark/:topicId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark a course for later' })
  async bookmarkCourse(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.lessonsService.bookmarkCourse(userId, topicId);
  }

  @Delete('bookmark/:topicId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a course bookmark' })
  async removeBookmark(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.lessonsService.removeBookmark(userId, topicId);
  }

  // ============== TUTORS (must be before :lessonId) ==============

  @Post('tutors/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a tutor to a course (Admin only)' })
  async assignTutor(
    @Body('tutorId') tutorId: string,
    @Body('topicId') topicId: string,
  ) {
    return this.lessonsService.assignTutor(tutorId, topicId);
  }

  @Delete('tutors/:tutorId/:topicId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a tutor from a course (Admin only)' })
  async removeTutor(
    @Param('tutorId') tutorId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.lessonsService.removeTutor(tutorId, topicId);
  }

  @Get('tutors/:topicId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tutors assigned to a course' })
  async getCourseTutors(@Param('topicId') topicId: string) {
    return this.lessonsService.getCourseTutors(topicId);
  }

  // ============== LESSON CONTENT (parameterized — must be last) ==============

  @Get(':lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get full lesson content (text, videos, code, links, questions)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 'uuid',
        title: 'Variables & Data Types',
        description: 'Learn var, let, const...',
        order: 1,
        duration: 15,
        isLocked: false,
        lockReason: null,
        tutors: [
          { firstName: 'Sarah', lastName: 'Mitchell', avatar: 'https://...' },
        ],
        contentBlocks: [
          {
            type: 'TEXT',
            order: 0,
            title: 'Introduction',
            content: '## Variables...',
          },
          {
            type: 'VIDEO',
            order: 1,
            title: 'Watch: Variables Explained',
            content: 'https://youtube.com/...',
            overview: '8-minute walkthrough',
            metadata: { duration: '8:24', provider: 'youtube' },
          },
          {
            type: 'CODE',
            order: 2,
            content: 'const x = 5;',
            metadata: { language: 'javascript' },
          },
        ],
        questions: [
          {
            id: 'uuid',
            text: 'Which keyword cannot be reassigned?',
            options: [
              { id: 'a', text: 'var' },
              { id: 'b', text: 'const' },
            ],
            points: 10,
          },
        ],
      },
    },
  })
  async getLessonContent(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonsService.getLessonWithAccessCheck(lessonId, userId);
  }

  @Post(':lessonId/answer/:questionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Answer a lesson question (returns correctness + explanation)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        isCorrect: true,
        correctAnswer: 'c',
        explanation: 'const declares a block-scoped constant.',
        points: 10,
      },
    },
  })
  async answerQuestion(
    @Param('questionId') questionId: string,
    @Body('selectedOption') selectedOption: string,
  ) {
    return this.lessonsService.answerLessonQuestion(questionId, selectedOption);
  }

  @Post(':lessonId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a lesson as completed (earns +20 XP)' })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        completed: true,
        score: 90,
        completedAt: '2026-07-17T...',
        xpEarned: 20,
        nextLesson: {
          id: 'uuid',
          title: 'Arrays & Objects',
          order: 2,
          duration: 20,
        },
      },
    },
  })
  async completeLesson(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
    @Body('score') score?: number,
  ) {
    return this.lessonsService.completeLesson(userId, lessonId, score);
  }
}
