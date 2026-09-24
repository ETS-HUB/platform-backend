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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecruiterService } from './recruiter.service';
import { AddToShortlistDto, UpdateShortlistNotesDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Recruiter')
@ApiBearerAuth()
@Controller('recruiter')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RECRUITER, Role.ADMIN)
export class RecruiterController {
  constructor(private recruiterService: RecruiterService) {}

  // ============== DASHBOARD ==============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get recruiter dashboard stats' })
  async getDashboard(@CurrentUser('id') recruiterId: string) {
    return this.recruiterService.getDashboard(recruiterId);
  }

  // ============== SHORTLIST ==============

  @Post('shortlist')
  @ApiOperation({ summary: 'Add a student to shortlist' })
  async addToShortlist(
    @CurrentUser('id') recruiterId: string,
    @Body() dto: AddToShortlistDto,
  ) {
    return this.recruiterService.addToShortlist(recruiterId, dto);
  }

  @Get('shortlist')
  @ApiOperation({ summary: 'Get all shortlisted candidates with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getShortlist(
    @CurrentUser('id') recruiterId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recruiterService.getShortlist(
      recruiterId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch('shortlist/:studentId/notes')
  @ApiOperation({ summary: 'Update notes on a shortlisted candidate' })
  async updateNotes(
    @CurrentUser('id') recruiterId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateShortlistNotesDto,
  ) {
    return this.recruiterService.updateNotes(recruiterId, studentId, dto);
  }

  @Delete('shortlist/:studentId')
  @ApiOperation({ summary: 'Remove a student from shortlist' })
  async removeFromShortlist(
    @CurrentUser('id') recruiterId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.recruiterService.removeFromShortlist(recruiterId, studentId);
  }

  // ============== EXPORT ==============

  @Get('export')
  @ApiOperation({ summary: 'Export shortlisted candidates as JSON or CSV' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'], description: 'Export format (default: json)' })
  async exportCandidates(
    @CurrentUser('id') recruiterId: string,
    @Query('format') format?: string,
  ) {
    return this.recruiterService.exportCandidates(
      recruiterId,
      (format as 'json' | 'csv') || 'json',
    );
  }
}
