import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TutorService } from './tutor.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Tutor')
@ApiBearerAuth()
@Controller('tutor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TUTOR, Role.ADMIN)
export class TutorController {
  constructor(private tutorService: TutorService) {}

  @Get('my-courses')
  @ApiOperation({
    summary:
      'Get all courses assigned to the current tutor with student/submission counts',
  })
  async getMyCourses(@CurrentUser('id') userId: string) {
    return this.tutorService.getMyCourses(userId);
  }

  @Get('courses/:topicId')
  @ApiOperation({
    summary:
      'Get full detail of an assigned course — lessons, drafts, students, assignment stats, co-tutors (Tutor/Admin)',
  })
  async getCourseDetail(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.tutorService.getTutorCourseDetail(userId, topicId);
  }

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Tutor overview dashboard — pending reviews, unread messages, assigned courses, recent activity',
  })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.tutorService.getTutorDashboard(userId);
  }
}
