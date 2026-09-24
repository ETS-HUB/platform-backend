import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TracksService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    slug: string;
    name: string;
    description?: string;
    imageUrl?: string;
  }) {
    const existing = await this.prisma.track.findUnique({
      where: { slug: data.slug },
    });
    if (existing) throw new ConflictException('Track slug already exists');
    return this.prisma.track.create({ data });
  }

  async findAll(includeInactive = false) {
    return this.prisma.track.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    id: string,
    data: Partial<{
      slug: string;
      name: string;
      description: string;
      icon: string;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.track.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.track.delete({ where: { id } });
    return { message: 'Track deleted' };
  }
}
