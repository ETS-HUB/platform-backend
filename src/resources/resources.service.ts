import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateResourceDto) {
    return this.prisma.resource.create({ data: dto });
  }

  async bulkCreate(resources: CreateResourceDto[]) {
    const created: any[] = [];
    for (const resource of resources) {
      const r = await this.prisma.resource.create({ data: resource });
      created.push(r);
    }
    return { uploaded: created.length, resources: created };
  }

  async findAll(filters: {
    topicId?: string;
    type?: string;
    difficulty?: string;
    learningStyle?: string;
    page?: number;
    limit?: number;
  }) {
    const { topicId, type, difficulty, learningStyle, page = 1, limit = 20 } = filters;

    const where: any = { isActive: true };
    if (topicId) where.topicId = topicId;
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (learningStyle) {
      where.OR = [
        { learningStyle: learningStyle },
        { learningStyle: null },
      ];
    }

    const [resources, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        include: { topic: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      resources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: Partial<CreateResourceDto>) {
    return this.prisma.resource.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.resource.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Get resources recommended for a specific user based on their profile
  async getRecommendedForUser(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    // Return stored AI recommendations if available
    if (profile.aiRecommendations) {
      return profile.aiRecommendations;
    }

    // Fallback: get resources matching learning style
    return this.prisma.resource.findMany({
      where: {
        isActive: true,
        OR: [
          { learningStyle: profile.learningStyle },
          { learningStyle: null },
        ],
      },
      include: { topic: { select: { name: true } } },
      take: 10,
    });
  }
}
