import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async checkAndAwardBadges(userId: string, attemptId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { badges: true },
    });

    if (!profile) return [];

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) return [];

    // Load active badge definitions from DB
    const definitions = await this.prisma.badgeDefinition.findMany({
      where: { isActive: true },
    });

    const existingBadgeNames = new Set(profile.badges.map((b) => b.name));
    const overallScore = attempt.percentageScore || 0;
    const topicScores = (attempt.topicScores as Record<string, any>) || {};
    const newBadges: any[] = [];

    for (const def of definitions) {
      // Skip if student already has this badge
      if (existingBadgeNames.has(def.name)) continue;

      const criteria = def.criteria as any;
      let earned = false;

      switch (criteria.type) {
        // { type: "assessment_score", minScore: 70 }
        // Awards when overall assessment percentage >= minScore
        case 'assessment_score':
          earned = overallScore >= criteria.minScore;
          break;

        // { type: "quiz_score", topic: "JavaScript", minScore: 75 }
        // Awards when the student scores >= minScore in a specific topic
        case 'quiz_score': {
          const topicEntry = Object.values(topicScores).find(
            (t: any) =>
              t.topicName?.toLowerCase() === criteria.topic?.toLowerCase(),
          );
          earned = topicEntry
            ? (topicEntry as any).percentage >= criteria.minScore
            : false;
          break;
        }

        // { type: "assessment_count", count: 5 }
        // Awards after completing N assessments total
        case 'assessment_count': {
          const total = await this.prisma.assessmentAttempt.count({
            where: { userId, completedAt: { not: null } },
          });
          earned = total >= criteria.count;
          break;
        }

        // { type: "practice_sessions", count: 10 }
        // Awards after completing N practice sessions
        case 'practice_sessions': {
          const total = await this.prisma.practiceSession.count({
            where: { userId, completedAt: { not: null } },
          });
          earned = total >= criteria.count;
          break;
        }

        // { type: "first_attempt" }
        // Awards on completing the very first assessment
        case 'first_attempt': {
          const total = await this.prisma.assessmentAttempt.count({
            where: { userId, completedAt: { not: null } },
          });
          earned = total >= 1;
          break;
        }
      }

      if (earned) {
        newBadges.push({
          name: def.name,
          description: def.description,
          imageUrl: def.imageUrl,
          profileId: profile.id,
        });
      }
    }

    // Save new badges
    for (const badge of newBadges) {
      await this.prisma.badge.create({ data: badge });
    }

    return newBadges;
  }

  async getUserBadges(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { badges: true },
    });

    return profile?.badges || [];
  }

  async getUserLevel(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { xp: true, level: true },
    });

    if (!profile) return null;

    const levelNames: Record<number, string> = {
      1: 'Explorer',
      10: 'Builder',
      20: 'Engineer',
      35: 'Senior Developer',
      50: 'Tech Mentor',
    };

    const currentLevelName =
      levelNames[profile.level] || `Level ${profile.level}`;

    // Find next level
    const levelThresholds = [
      { level: 10, xp: 500 },
      { level: 20, xp: 1500 },
      { level: 35, xp: 3000 },
      { level: 50, xp: 5000 },
    ];

    const nextLevel = levelThresholds.find((l) => l.xp > profile.xp);

    return {
      xp: profile.xp,
      level: profile.level,
      levelName: currentLevelName,
      nextLevel: nextLevel
        ? {
            level: nextLevel.level,
            name: levelNames[nextLevel.level],
            xpRequired: nextLevel.xp,
            xpRemaining: nextLevel.xp - profile.xp,
            progress: Math.round((profile.xp / nextLevel.xp) * 100),
          }
        : null,
    };
  }

  async getAvailableBadges() {
    return this.prisma.badgeDefinition.findMany({
      where: { isActive: true },
    });
  }

  async getBadgeDefinitions(page = 1, limit = 20) {
    const [definitions, total] = await Promise.all([
      this.prisma.badgeDefinition.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.badgeDefinition.count(),
    ]);

    return {
      definitions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createBadgeDefinition(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    criteria: any;
  }) {
    return this.prisma.badgeDefinition.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        criteria: data.criteria,
      },
    });
  }

  async updateBadgeDefinition(id: string, data: any) {
    return this.prisma.badgeDefinition.update({ where: { id }, data });
  }

  async deleteBadgeDefinition(id: string) {
    await this.prisma.badgeDefinition.delete({ where: { id } });
    return { message: 'Badge definition deleted' };
  }

  async generateCertificate(userId: string, attemptId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        badges: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { config: { select: { name: true } } },
    });

    if (!attempt || !attempt.completedAt) {
      throw new NotFoundException('Completed assessment not found');
    }

    const topicScores = attempt.topicScores as Record<string, any>;

    // Find strongest topics
    const strengths = topicScores
      ? Object.values(topicScores)
          .filter((t: any) => t.percentage >= 70)
          .sort((a: any, b: any) => b.percentage - a.percentage)
          .slice(0, 3)
          .map((t: any) => ({
            topic: t.topicName,
            score: Math.round(t.percentage),
          }))
      : [];

    // Get percentile
    const totalCompleted = await this.prisma.assessmentAttempt.count({
      where: { completedAt: { not: null } },
    });
    const belowCount = await this.prisma.assessmentAttempt.count({
      where: {
        completedAt: { not: null },
        percentageScore: { lt: attempt.percentageScore || 0 },
      },
    });
    const percentile =
      totalCompleted > 0 ? Math.round((belowCount / totalCompleted) * 100) : 50;

    // Build certificate data (structured JSON for frontend rendering)
    return {
      certificate: {
        id: `ETS-CERT-${attempt.id.slice(0, 8).toUpperCase()}`,
        studentName: `${profile.user.firstName} ${profile.user.lastName}`,
        assessmentName: attempt.config.name,
        completedAt: attempt.completedAt,
        overallScore: Math.round(attempt.percentageScore || 0),
        percentile,
        level: profile.level,
        levelName: this.getLevelName(profile.level),
        xp: profile.xp,
        strengths,
        badges: profile.badges.map((b) => ({
          name: b.name,
          imageUrl: b.imageUrl,
          description: b.description,
          earnedAt: b.earnedAt,
        })),
        topicBreakdown: topicScores
          ? Object.values(topicScores).map((t: any) => ({
              topic: t.topicName,
              score: Math.round(t.percentage),
              correct: t.correct,
              total: t.total,
            }))
          : [],
        // Metadata for social sharing card
        shareCard: {
          title: `${profile.user.firstName} ${profile.user.lastName} - Skill Assessment`,
          subtitle: `Scored ${Math.round(attempt.percentageScore || 0)}% | Top ${100 - percentile}% of candidates`,
          highlights: strengths.map((s) => `${s.topic}: ${s.score}%`),
          badgeCount: profile.badges.length,
          platform: 'ETS Platform',
          verifyUrl: `/verify/${attempt.id.slice(0, 8).toUpperCase()}`,
        },
      },
    };
  }

  private getLevelName(level: number): string {
    if (level >= 50) return 'Tech Mentor';
    if (level >= 35) return 'Senior Developer';
    if (level >= 20) return 'Engineer';
    if (level >= 10) return 'Builder';
    return 'Explorer';
  }
}
