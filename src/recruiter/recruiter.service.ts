import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToShortlistDto, UpdateShortlistNotesDto } from './dto';

@Injectable()
export class RecruiterService {
  constructor(private prisma: PrismaService) {}

  // ============== SHORTLIST ==============

  async addToShortlist(recruiterId: string, dto: AddToShortlistDto) {
    // Verify student exists
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) throw new NotFoundException('Student not found');

    // Check if already shortlisted
    const existing = await this.prisma.shortlist.findUnique({
      where: {
        recruiterId_studentId: {
          recruiterId,
          studentId: dto.studentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Student already in shortlist');
    }

    return this.prisma.shortlist.create({
      data: {
        recruiterId,
        studentId: dto.studentId,
        notes: dto.notes,
      },
    });
  }

  async getShortlist(recruiterId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.shortlist.findMany({
        where: { recruiterId },
        include: {
          recruiter: false,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shortlist.count({ where: { recruiterId } }),
    ]);

    // Enrich with student profile data
    const enriched = await Promise.all(
      items.map(async (item) => {
        const student = await this.prisma.user.findUnique({
          where: { id: item.studentId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                goal: true,
                experienceLevel: true,
                xp: true,
                level: true,
                aiSkillReport: true,
              },
            },
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
              select: {
                percentageScore: true,
                topicScores: true,
                completedAt: true,
              },
            },
          },
        });

        return {
          ...item,
          student,
        };
      }),
    );

    return {
      shortlist: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateNotes(
    recruiterId: string,
    studentId: string,
    dto: UpdateShortlistNotesDto,
  ) {
    const item = await this.prisma.shortlist.findUnique({
      where: {
        recruiterId_studentId: { recruiterId, studentId },
      },
    });

    if (!item) throw new NotFoundException('Shortlist entry not found');

    return this.prisma.shortlist.update({
      where: {
        recruiterId_studentId: { recruiterId, studentId },
      },
      data: { notes: dto.notes },
    });
  }

  async removeFromShortlist(recruiterId: string, studentId: string) {
    const item = await this.prisma.shortlist.findUnique({
      where: {
        recruiterId_studentId: { recruiterId, studentId },
      },
    });

    if (!item) throw new NotFoundException('Shortlist entry not found');

    await this.prisma.shortlist.delete({
      where: {
        recruiterId_studentId: { recruiterId, studentId },
      },
    });

    return { message: 'Removed from shortlist' };
  }

  // ============== EXPORT ==============

  async exportCandidates(recruiterId: string, format: 'json' | 'csv' = 'json') {
    // Get all shortlisted candidates with full data
    const shortlisted = await this.prisma.shortlist.findMany({
      where: { recruiterId },
    });

    const candidates = await Promise.all(
      shortlisted.map(async (item) => {
        const student = await this.prisma.user.findUnique({
          where: { id: item.studentId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                goal: true,
                experienceLevel: true,
                xp: true,
                level: true,
              },
            },
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
              select: {
                percentageScore: true,
                topicScores: true,
                completedAt: true,
              },
            },
          },
        });

        return {
          name: `${student?.firstName} ${student?.lastName}`,
          email: student?.email,
          goal: student?.profile?.goal,
          experienceLevel: student?.profile?.experienceLevel,
          level: student?.profile?.level,
          xp: student?.profile?.xp,
          latestScore: student?.assessmentAttempts[0]?.percentageScore,
          assessedAt: student?.assessmentAttempts[0]?.completedAt,
          notes: item.notes,
          shortlistedAt: item.createdAt,
        };
      }),
    );

    if (format === 'csv') {
      const headers = [
        'Name',
        'Email',
        'Goal',
        'Experience Level',
        'Level',
        'XP',
        'Latest Score (%)',
        'Assessed At',
        'Notes',
        'Shortlisted At',
      ];

      const rows = candidates.map((c) =>
        [
          c.name,
          c.email,
          c.goal,
          c.experienceLevel,
          c.level,
          c.xp,
          c.latestScore ? Math.round(c.latestScore) : '',
          c.assessedAt ? new Date(c.assessedAt).toISOString().split('T')[0] : '',
          c.notes || '',
          new Date(c.shortlistedAt).toISOString().split('T')[0],
        ].join(','),
      );

      return {
        format: 'csv',
        data: [headers.join(','), ...rows].join('\n'),
        totalCandidates: candidates.length,
      };
    }

    return {
      format: 'json',
      data: candidates,
      totalCandidates: candidates.length,
    };
  }

  // ============== RECRUITER DASHBOARD ==============

  async getDashboard(recruiterId: string) {
    const shortlistCount = await this.prisma.shortlist.count({
      where: { recruiterId },
    });

    const totalCandidates = await this.prisma.studentProfile.count({
      where: { isVisibleToRecruiters: true },
    });

    // Get top-scoring candidates from shortlist
    const shortlisted = await this.prisma.shortlist.findMany({
      where: { recruiterId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const recentShortlisted = await Promise.all(
      shortlisted.map(async (item) => {
        const student = await this.prisma.user.findUnique({
          where: { id: item.studentId },
          select: {
            firstName: true,
            lastName: true,
            profile: { select: { goal: true } },
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
              select: { percentageScore: true },
            },
          },
        });
        return {
          name: `${student?.firstName} ${student?.lastName}`,
          goal: student?.profile?.goal,
          score: student?.assessmentAttempts[0]?.percentageScore,
          shortlistedAt: item.createdAt,
        };
      }),
    );

    // Goal distribution in talent pool
    const profiles = await this.prisma.studentProfile.findMany({
      where: { isVisibleToRecruiters: true },
      select: { goal: true },
    });

    const goalDistribution: Record<string, number> = {};
    for (const p of profiles) {
      goalDistribution[p.goal] = (goalDistribution[p.goal] || 0) + 1;
    }

    return {
      shortlistCount,
      totalCandidatesAvailable: totalCandidates,
      recentShortlisted,
      talentPoolByGoal: Object.entries(goalDistribution)
        .map(([goal, count]) => ({ goal, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
