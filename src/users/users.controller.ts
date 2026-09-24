import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with assessment history' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 'uuid',
        email: 'demo@student.com',
        firstName: 'Alex',
        lastName: 'Johnson',
        avatar: 'https://...',
        role: 'STUDENT',
        profile: {
          goal: 'Frontend Developer',
          trackSlug: 'frontend',
          experienceLevel: 'BEGINNER',
          learningStyle: 'VISUAL',
          weeklyHours: 15,
          xp: 566,
          level: 1,
          badges: [{ name: 'HTML Expert', icon: '🌐' }],
        },
        assessmentAttempts: [
          {
            percentageScore: 68,
            config: { name: 'Frontend Developer Assessment' },
          },
        ],
      },
    },
  })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create student onboarding profile (goals, learning style, etc.)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 'uuid',
        userId: 'uuid',
        goal: 'Frontend Developer',
        trackSlug: 'frontend',
        experienceLevel: 'BEGINNER',
        learningStyle: 'VISUAL',
        weeklyHours: 15,
        xp: 0,
        level: 1,
        isVisibleToRecruiters: false,
      },
    },
  })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.usersService.createProfile(userId, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateProfileDto>,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('profile/:userId')
  @ApiOperation({
    summary: 'Get public student profile (visible to recruiters)',
  })
  async getPublicProfile(@Param('userId') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }

  @Get('candidates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Browse assessed candidates with filters (Recruiter/Admin only)',
  })
  @ApiQuery({ name: 'skill', required: false })
  @ApiQuery({ name: 'minScore', required: false })
  @ApiQuery({ name: 'maxScore', required: false })
  @ApiQuery({
    name: 'experienceLevel',
    required: false,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
  @ApiQuery({ name: 'goal', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        candidates: [
          {
            id: 'uuid',
            firstName: 'Alex',
            lastName: 'Johnson',
            profile: { goal: 'Frontend Developer', xp: 566 },
            assessmentAttempts: [{ percentageScore: 68 }],
          },
        ],
        pagination: { page: 1, limit: 20, total: 9, totalPages: 1 },
      },
    },
  })
  async getCandidates(
    @Query('skill') skill?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('goal') goal?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getCandidates({
      skill,
      minScore: minScore ? parseFloat(minScore) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      experienceLevel,
      goal,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
