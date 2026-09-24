import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalStudents,
      totalAssessments,
      totalPracticeSessions,
      completedAssessments,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.assessmentAttempt.count(),
      this.prisma.practiceSession.count({ where: { completedAt: { not: null } } }),
      this.prisma.assessmentAttempt.count({
        where: { completedAt: { not: null } },
      }),
    ]);

    return {
      totalStudents,
      totalAssessments,
      completedAssessments,
      totalPracticeSessions,
      completionRate:
        totalAssessments > 0
          ? Math.round((completedAssessments / totalAssessments) * 100)
          : 0,
    };
  }

  async getScoreDistribution() {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { completedAt: { not: null } },
      select: { percentageScore: true },
    });

    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    for (const attempt of attempts) {
      const score = attempt.percentageScore || 0;
      if (score <= 20) distribution['0-20']++;
      else if (score <= 40) distribution['21-40']++;
      else if (score <= 60) distribution['41-60']++;
      else if (score <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    }

    return distribution;
  }

  async getTopicPerformance() {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        completedAt: { not: null },
        NOT: { topicScores: { equals: undefined } },
      },
      select: { topicScores: true },
    });

    const topicAggregates: Record<
      string,
      { totalPercentage: number; count: number }
    > = {};

    for (const attempt of attempts) {
      const scores = attempt.topicScores as Record<string, any>;
      for (const [, data] of Object.entries(scores)) {
        const name = data.topicName;
        if (!topicAggregates[name]) {
          topicAggregates[name] = { totalPercentage: 0, count: 0 };
        }
        topicAggregates[name].totalPercentage += data.percentage;
        topicAggregates[name].count++;
      }
    }

    return Object.entries(topicAggregates)
      .map(([topic, data]) => ({
        topic,
        averageScore: Math.round(data.totalPercentage / data.count),
        totalAttempts: data.count,
      }))
      .sort((a, b) => a.averageScore - b.averageScore);
  }

  async getSkillGaps() {
    const topicPerformance = await this.getTopicPerformance();
    // Return topics where average score is below 60%
    return topicPerformance
      .filter((t) => t.averageScore < 60)
      .map((t) => ({
        topic: t.topic,
        averageScore: t.averageScore,
        severity:
          t.averageScore < 30
            ? 'critical'
            : t.averageScore < 45
              ? 'high'
              : 'moderate',
      }));
  }

  async getRecentActivity(limit = 20) {
    const recentAssessments = await this.prisma.assessmentAttempt.findMany({
      where: { completedAt: { not: null } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        config: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return recentAssessments.map((a) => ({
      studentName: `${a.user.firstName} ${a.user.lastName}`,
      email: a.user.email,
      assessment: a.config.name,
      score: Math.round(a.percentageScore || 0),
      completedAt: a.completedAt,
    }));
  }

  async getGoalDistribution() {
    const profiles = await this.prisma.studentProfile.findMany({
      select: { goal: true },
    });

    const goals: Record<string, number> = {};
    for (const profile of profiles) {
      const goal = profile.goal || 'Unspecified';
      goals[goal] = (goals[goal] || 0) + 1;
    }

    return Object.entries(goals)
      .map(([goal, count]) => ({ goal, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getExperienceLevelDistribution() {
    const profiles = await this.prisma.studentProfile.findMany({
      select: { experienceLevel: true },
    });

    const levels: Record<string, number> = {};
    for (const profile of profiles) {
      levels[profile.experienceLevel] =
        (levels[profile.experienceLevel] || 0) + 1;
    }

    return levels;
  }
}
