import {
  Controller,
  Get,
  Post,
  Delete,
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
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Certificates')
@ApiBearerAuth()
@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Get('eligibility/:topicId')
  @ApiOperation({
    summary: 'Check certificate eligibility for a course (criteria breakdown)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        eligible: false,
        issued: false,
        issuedAt: null,
        certificateId: null,
        criteria: {
          lessonsComplete: { done: 9, total: 9, met: true },
          projectsApproved: { done: 0, total: 2, met: false },
          averageQuizScore: { score: 91, required: 60, met: true },
        },
      },
    },
  })
  async checkEligibility(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.certificatesService.checkEligibility(userId, topicId);
  }

  @Post('claim/:topicId')
  @ApiOperation({
    summary: 'Claim certificate for a completed course (if eligible)',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 'uuid',
        certificateId: 'ETS-JAVA-A1B2C3D4',
        courseName: 'JavaScript Fundamentals',
        grade: 'B',
        lessonsCompleted: 9,
        totalLessons: 9,
        averageQuizScore: 85,
        issuedAt: '2026-07-20T...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Not eligible — returns criteria breakdown',
  })
  async claimCertificate(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.certificatesService.claimCertificate(userId, topicId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all my earned certificates' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          certificateId: 'ETS-JAVA-A1B2C3D4',
          grade: 'B',
          averageQuizScore: 85,
          issuedAt: '2026-07-20T...',
          topic: {
            name: 'JavaScript Fundamentals',
            icon: '🟨',
            parent: { name: 'Programming' },
          },
        },
      ],
    },
  })
  async myCertificates(@CurrentUser('id') userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }

  @Get('verify/:certificateId')
  @ApiOperation({ summary: 'Verify/view a certificate by its ID (public)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        certificateId: 'ETS-JAVA-A1B2C3D4',
        studentName: 'Alex Johnson',
        studentAvatar: 'https://...',
        courseName: 'JavaScript Fundamentals',
        grade: 'B',
        totalHoursCommitted: 2.5,
        lessons: [{ title: 'Variables & Data Types', order: 1, duration: 15 }],
        projects: [{ title: 'Build a Quiz App', score: 92 }],
        platform: 'ETS Platform',
      },
    },
  })
  async verify(@Param('certificateId') certificateId: string) {
    return this.certificatesService.getCertificateDetail(certificateId);
  }

  @Delete('revoke/:topicId/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revoke a certificate (Admin only)' })
  async revoke(
    @Param('topicId') topicId: string,
    @Param('userId') userId: string,
  ) {
    return this.certificatesService.revokeCertificate(userId, topicId);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all issued certificates with filters and pagination (Admin)',
  })
  @ApiQuery({ name: 'topicId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'grade', required: false, enum: ['A', 'B', 'B-', 'C'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllCertificates(
    @Query('topicId') topicId?: string,
    @Query('userId') userId?: string,
    @Query('grade') grade?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.certificatesService.getAllCertificates({
      topicId,
      userId,
      grade,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
