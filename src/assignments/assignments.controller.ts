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
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Assignments')
@ApiBearerAuth()
@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  // ============== TUTOR/ADMIN: Create & Manage ==============

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Create an assignment/project for a course (Tutor/Admin)',
  })
  async create(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.assignmentsService.createAssignment(userId, data);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update an assignment (Tutor/Admin)' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.assignmentsService.updateAssignment(id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete an assignment (Tutor/Admin)' })
  async delete(@Param('id') id: string) {
    return this.assignmentsService.deleteAssignment(id);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all assignments with filters and pagination (Admin)',
  })
  @ApiQuery({ name: 'topicId', required: false })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['PROJECT', 'EXERCISE', 'QUIZ'],
  })
  @ApiQuery({ name: 'isPublished', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllAssignments(
    @Query('topicId') topicId?: string,
    @Query('type') type?: string,
    @Query('isPublished') isPublished?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assignmentsService.getAllAssignments({
      topicId,
      type,
      isPublished:
        isPublished !== undefined ? isPublished === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ============== TUTOR: Review ==============

  @Get(':assignmentId/submissions')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Get all submissions for a specific assignment (Tutor/Admin)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMIT'],
  })
  async getAssignmentSubmissions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('assignmentId') assignmentId: string,
    @Query('status') status?: string,
  ) {
    return this.assignmentsService.getSubmissionsForAssignment(
      assignmentId,
      userId,
      role === Role.ADMIN,
      status,
    );
  }

  @Get('submissions/:topicId')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary:
      'Get all submissions for a course (Tutor/Admin) — tutors scoped to assigned courses only',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMIT'],
  })
  async getSubmissions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('topicId') topicId: string,
    @Query('status') status?: string,
  ) {
    return this.assignmentsService.getSubmissionsForReview(
      topicId,
      userId,
      role === Role.ADMIN,
      status,
    );
  }

  @Get('my-review-queue')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Get all pending submissions across all assigned courses (Tutor)',
  })
  async myReviewQueue(@CurrentUser('id') userId: string) {
    return this.assignmentsService.getMyReviewQueue(userId);
  }

  @Get('my-review-history')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Get all submissions already reviewed by this tutor (paginated)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async myReviewHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assignmentsService.getMyReviewHistory(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('review/:submissionId')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Review a submission (approve/reject with score & feedback)',
  })
  async review(
    @CurrentUser('id') reviewerId: string,
    @Param('submissionId') submissionId: string,
    @Body() data: { status: string; score?: number; feedback?: string },
  ) {
    return this.assignmentsService.reviewSubmission(
      submissionId,
      reviewerId,
      data,
    );
  }

  // ============== STUDENT: View & Submit ==============

  @Get('tutor/course/:topicId')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiOperation({
    summary:
      'Get all assignments for a course with submission stats (Tutor/Admin) — shows submitted/not submitted/pending/approved per assignment',
  })
  async getCourseAssignmentsForTutor(@Param('topicId') topicId: string) {
    return this.assignmentsService.getCourseAssignmentsForTutor(topicId);
  }

  @Get('course/:topicId')
  @ApiOperation({
    summary: 'Get all assignments for a course (with my submission status)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          title: 'Exercise: Array Method Challenges',
          type: 'EXERCISE',
          points: 50,
          dueDate: '2026-07-24T...',
          createdBy: { firstName: 'Sarah', lastName: 'Mitchell' },
          totalSubmissions: 1,
          mySubmission: {
            status: 'APPROVED',
            score: 92,
            feedback: 'Excellent work!',
          },
        },
      ],
    },
  })
  async getCourseAssignments(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.assignmentsService.getCourseAssignments(topicId, userId);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get assignment detail' })
  async getDetail(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.assignmentsService.getAssignmentDetail(id, userId);
  }

  @Post('submit/:assignmentId')
  @ApiOperation({ summary: 'Submit an assignment (link, files, or text)' })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 'uuid',
        assignmentId: 'uuid',
        status: 'SUBMITTED',
        link: 'https://github.com/alex/project',
        files: [
          {
            url: 'https://...',
            fileName: 'screenshot.png',
            fileType: 'image/png',
            fileSize: 200000,
          },
        ],
        text: 'My explanation',
        submittedAt: '2026-07-17T...',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Already submitted — wait for review or resubmit if rejected',
  })
  async submit(
    @CurrentUser('id') userId: string,
    @Param('assignmentId') assignmentId: string,
    @Body()
    data: {
      link?: string;
      files?: Array<{
        url: string;
        fileName: string;
        fileType: string;
        fileSize?: number;
      }>;
      text?: string;
    },
  ) {
    return this.assignmentsService.submitAssignment(assignmentId, userId, data);
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get all my submissions across courses' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          status: 'APPROVED',
          score: 92,
          feedback: 'Excellent work!',
          submittedAt: '2026-07-15T...',
          assignment: {
            title: 'Exercise: Array Method Challenges',
            points: 50,
            type: 'EXERCISE',
            topic: { name: 'JavaScript Fundamentals' },
          },
        },
      ],
    },
  })
  async mySubmissions(@CurrentUser('id') userId: string) {
    return this.assignmentsService.getMySubmissions(userId);
  }

  @Get('my-projects')
  @ApiOperation({
    summary: 'Get all projects from enrolled courses (with submission status)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          title: 'Final Project: Build a Quiz App',
          type: 'PROJECT',
          points: 100,
          courseName: 'JavaScript Fundamentals',
          courseIcon: '🟨',
          isSubmitted: true,
          submission: {
            status: 'SUBMITTED',
            score: null,
            feedback: null,
            submittedAt: '2026-07-17T...',
          },
        },
      ],
    },
  })
  async myProjects(@CurrentUser('id') userId: string) {
    return this.assignmentsService.getMyProjects(userId);
  }
}
