import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

const dashboardExample = {
  user: {
    id: 'uuid',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'demo@student.com',
    avatar: 'https://...',
    profile: {
      goal: 'Frontend Developer',
      trackSlug: 'frontend',
      xp: 566,
      level: 1,
    },
    levelInfo: {
      levelName: 'Explorer',
      xp: 566,
      nextLevel: { name: 'Builder', xpRequired: 500, progress: 100 },
    },
  },
  enrolledCourses: [
    {
      courseId: 'uuid',
      courseName: 'JavaScript Fundamentals',
      percentage: 38,
      status: 'in_progress',
      nextLesson: {
        title: 'Functions & Scope',
        video: { url: 'https://youtube.com/...' },
      },
    },
  ],
  assessmentSummary: {
    taken: true,
    totalAttempts: 1,
    latest: {
      score: 68,
      assessmentName: 'Frontend Developer Assessment',
      track: 'frontend',
    },
  },
  suggestedCourses: [
    { courseId: 'uuid', courseName: 'TypeScript for React', totalLessons: 7 },
  ],
  recentActivity: {
    lessons: [
      { title: 'ES6+ Features', score: 85, completedAt: '2026-07-14T...' },
    ],
    practice: [
      { correctAnswers: 8, totalQuestions: 10, completedAt: '2026-07-15T...' },
    ],
  },
  stats: {
    totalCoursesEnrolled: 3,
    coursesCompleted: 0,
    coursesInProgress: 1,
    totalLessonsCompleted: 9,
  },
};

const courseDetailExample = {
  course: {
    id: 'uuid',
    name: 'JavaScript Fundamentals',
    icon: '🟨',
    category: 'Programming',
    totalEnrolled: 9,
    totalLessons: 9,
    totalDuration: 153,
  },
  enrollment: { enrolled: true, enrolledAt: '2026-07-16T...' },
  isBookmarked: false,
  certificate: { issued: false },
  certificateCriteria: {
    minQuizScore: 60,
    requirements: [
      { key: 'lessons', label: 'Complete all lessons' },
      { key: 'projects', label: 'All projects approved' },
      { key: 'quizScore', label: 'Average quiz score ≥ 60%' },
    ],
  },
  tutors: [
    {
      id: 'uuid',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      avatar: 'https://...',
    },
  ],
  progress: { completedLessons: 9, totalLessons: 9, percentage: 100 },
  nextLesson: null,
  lessons: {
    completed: [
      {
        title: 'Variables & Data Types',
        order: 1,
        score: 90,
        completedAt: '...',
      },
    ],
    ongoing: null,
    upcoming: [],
  },
  enrolledStudents: {
    preview: [
      { firstName: 'Alex', lastName: 'Johnson', avatar: 'https://...' },
    ],
    total: 9,
  },
};

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get student dashboard (enrolled courses, progress, stats, suggestions)',
  })
  @ApiResponse({
    status: 200,
    description: 'Full student dashboard data',
    schema: { example: dashboardExample },
  })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getStudentDashboard(userId);
  }

  @Get('courses')
  @ApiOperation({
    summary:
      'Get all enrolled courses with progress, assessment summary, suggested courses, recent activity, stats',
  })
  @ApiResponse({
    status: 200,
    description: 'My courses page data',
    schema: {
      example: {
        enrolledCourses: dashboardExample.enrolledCourses,
        assessmentSummary: dashboardExample.assessmentSummary,
        suggestedCourses: dashboardExample.suggestedCourses,
        recentActivity: dashboardExample.recentActivity,
        stats: dashboardExample.stats,
      },
    },
  })
  async getEnrolledCourses(@CurrentUser('id') userId: string) {
    return this.dashboardService.getCoursesPageData(userId);
  }

  @Get('courses/:courseId')
  @ApiOperation({
    summary:
      'Get course detail (progress, lessons breakdown, enrolled students, next lesson)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Course detail with all lesson status, tutors, certificate criteria',
    schema: { example: courseDetailExample },
  })
  async getCourseDetail(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.dashboardService.getCourseDetail(userId, courseId);
  }

  @Get('suggested')
  @ApiOperation({
    summary: 'Get suggested courses based on goal/track (not yet enrolled)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          courseId: 'uuid',
          courseName: 'TypeScript for React',
          category: 'Programming',
          totalLessons: 7,
          totalEnrolled: 0,
        },
      ],
    },
  })
  async getSuggestedCourses(@CurrentUser('id') userId: string) {
    return this.dashboardService.getSuggestedCourses(userId);
  }
}
