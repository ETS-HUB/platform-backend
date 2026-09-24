import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: { badges: true },
        },
        assessmentAttempts: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createProfile(userId: string, dto: CreateProfileDto) {
    const existing = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Profile already exists');
    }

    return this.prisma.studentProfile.create({
      data: {
        userId,
        goal: dto.goal,
        experienceLevel: dto.experienceLevel,
        learningStyle: dto.learningStyle,
        weeklyHours: dto.weeklyHours,
      },
    });
  }

  async updateProfile(userId: string, dto: Partial<CreateProfileDto>) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found. Create one first.');
    }

    return this.prisma.studentProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getPublicProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        badges: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
              select: {
                percentageScore: true,
                topicScores: true,
                completedAt: true,
                aiReport: true,
              },
            },
          },
        },
      },
    });

    if (!profile || !profile.isVisibleToRecruiters) {
      throw new NotFoundException('Profile not found or not public');
    }

    return profile;
  }

  // Recruiter: browse candidates with filters
  async getCandidates(filters: {
    skill?: string;
    minScore?: number;
    maxScore?: number;
    experienceLevel?: string;
    goal?: string;
    page?: number;
    limit?: number;
  }) {
    const { skill, minScore, maxScore, experienceLevel, goal, page = 1, limit = 20 } = filters;

    const where: any = {
      isVisibleToRecruiters: true,
    };

    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    if (goal) {
      where.goal = { contains: goal, mode: 'insensitive' };
    }

    const profiles = await this.prisma.studentProfile.findMany({
      where,
      include: {
        badges: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    // Filter by score if requested (post-query since score is in assessment)
    let filtered = profiles;
    if (minScore !== undefined || maxScore !== undefined) {
      filtered = profiles.filter((p) => {
        const latestAttempt = p.user.assessmentAttempts[0];
        if (!latestAttempt) return false;
        const score = latestAttempt.percentageScore || 0;
        if (minScore !== undefined && score < minScore) return false;
        if (maxScore !== undefined && score > maxScore) return false;
        return true;
      });
    }

    const total = await this.prisma.studentProfile.count({ where });

    return {
      candidates: filtered,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
