import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getXpLeaderboard(trackSlug?: string, limit = 20) {
    const where: any = {
      isVisibleToRecruiters: true, // opt-in flag — if false, student is hidden
    };
    if (trackSlug) where.trackSlug = trackSlug;

    const profiles = await this.prisma.studentProfile.findMany({
      where,
      select: {
        xp: true,
        level: true,
        trackSlug: true,
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { xp: 'desc' },
      take: limit,
    });

    return profiles.map((p, index) => ({
      rank: index + 1,
      userId: p.user.id,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      avatar: p.user.avatar,
      xp: p.xp,
      level: p.level,
      trackSlug: p.trackSlug,
    }));
  }

  async getLessonsLeaderboard(trackSlug?: string, limit = 20) {
    const where: any = { isVisibleToRecruiters: true };
    if (trackSlug) where.trackSlug = trackSlug;

    const profiles = await this.prisma.studentProfile.findMany({
      where,
      select: {
        trackSlug: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            lessonProgress: {
              where: { completed: true },
              select: { id: true },
            },
          },
        },
      },
    });

    const ranked = profiles
      .map((p) => ({
        userId: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        avatar: p.user.avatar,
        trackSlug: p.trackSlug,
        lessonsCompleted: p.user.lessonProgress.length,
      }))
      .sort((a, b) => b.lessonsCompleted - a.lessonsCompleted)
      .slice(0, limit)
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    return ranked;
  }

  async getAssessmentLeaderboard(trackSlug?: string, limit = 20) {
    const where: any = { isVisibleToRecruiters: true };
    if (trackSlug) where.trackSlug = trackSlug;

    const profiles = await this.prisma.studentProfile.findMany({
      where,
      select: {
        trackSlug: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              select: { percentageScore: true },
            },
          },
        },
      },
    });

    const withScores = profiles
      .map((p) => {
        const attempts = p.user.assessmentAttempts.filter(
          (a) => a.percentageScore !== null,
        );
        const avgScore =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + (a.percentageScore || 0), 0) /
                  attempts.length,
              )
            : 0;
        return {
          userId: p.user.id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          avatar: p.user.avatar,
          trackSlug: p.trackSlug,
          avgScore,
          totalAttempts: attempts.length,
        };
      })
      .filter((s) => s.totalAttempts > 0)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit)
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    return withScores;
  }

  async getMyRank(userId: string, category: string, trackSlug?: string) {
    let leaderboard: any[] = [];

    if (category === 'xp')
      leaderboard = await this.getXpLeaderboard(trackSlug, 200);
    else if (category === 'lessons')
      leaderboard = await this.getLessonsLeaderboard(trackSlug, 200);
    else if (category === 'assessment')
      leaderboard = await this.getAssessmentLeaderboard(trackSlug, 200);

    const myEntry = leaderboard.find((e) => e.userId === userId);
    const myRank = myEntry?.rank || null;

    // Return top 10 + surrounding 5 students (2 above, me, 2 below)
    const top10 = leaderboard.slice(0, 10);
    let surrounding: any[] = [];

    if (myRank && myRank > 10) {
      const start = Math.max(10, myRank - 3);
      const end = Math.min(leaderboard.length, myRank + 2);
      surrounding = leaderboard.slice(start, end);
    }

    return {
      myRank,
      myEntry,
      top10,
      surrounding,
      totalParticipants: leaderboard.length,
    };
  }
}
