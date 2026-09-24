import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  async getTopicsForPractice(userId: string) {
    // Get student's track
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { trackSlug: true },
    });

    // Get the user's latest assessment to determine weak areas
    const latestAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
    });

    // Filter topics: only those with questions AND matching student's track (or general)
    const where: any = {
      questions: { some: {} }, // only topics that have questions
    };
    if (profile?.trackSlug) {
      where.OR = [{ track: profile.trackSlug }, { track: null }];
    }

    const topics = await this.prisma.topic.findMany({
      where,
      include: { _count: { select: { questions: true } } },
      orderBy: { name: 'asc' },
    });

    if (!latestAttempt || !latestAttempt.topicScores) {
      return topics.map((t) => ({
        ...t,
        recommendedPriority: 'medium' as const,
        lastScore: null,
      }));
    }

    const topicScores = latestAttempt.topicScores as Record<string, any>;

    return topics.map((t) => {
      const score = Object.values(topicScores).find(
        (s: any) => s.topicName === t.name,
      );
      return {
        ...t,
        recommendedPriority: score
          ? score.percentage < 40
            ? 'high'
            : score.percentage < 70
              ? 'medium'
              : 'low'
          : 'medium',
        lastScore: score ? Math.round(score.percentage) : null,
      };
    });
  }

  async startPracticeSession(userId: string, topicId: string, count = 10) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) throw new NotFoundException('Topic not found');

    // Get random questions from this topic
    const questions = await this.prisma.question.findMany({
      where: { topicId, isActive: true },
      take: count,
    });

    // Create session
    const session = await this.prisma.practiceSession.create({
      data: {
        userId,
        topicId,
        totalQuestions: questions.length,
      },
    });

    return {
      sessionId: session.id,
      topic: topic.name,
      totalQuestions: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: (q.options as any[]).map((o) => ({ id: o.id, text: o.text })),
        difficulty: q.difficulty,
      })),
    };
  }

  async submitPracticeAnswer(questionId: string, selectedOption: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) throw new NotFoundException('Question not found');

    const options = question.options as any[];
    const correctOption = options.find((o) => o.isCorrect);
    const isCorrect = correctOption?.id === selectedOption;

    return {
      isCorrect,
      correctAnswer: correctOption?.id,
      explanation: question.explanation,
    };
  }

  async completePracticeSession(
    sessionId: string,
    userId: string,
    correctAnswers: number,
  ) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) throw new NotFoundException('Session not found');

    const updated = await this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        correctAnswers,
        completedAt: new Date(),
      },
    });

    // Award XP for practice
    const xpEarned =
      10 + Math.round((correctAnswers / session.totalQuestions) * 10);
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (profile) {
      await this.prisma.studentProfile.update({
        where: { userId },
        data: { xp: profile.xp + xpEarned },
      });
    }

    return {
      sessionId: updated.id,
      totalQuestions: updated.totalQuestions,
      correctAnswers,
      percentage: Math.round((correctAnswers / updated.totalQuestions) * 100),
      xpEarned,
    };
  }

  async getPracticeHistory(userId: string, page = 1, limit = 20) {
    const [sessions, total] = await Promise.all([
      this.prisma.practiceSession.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.practiceSession.count({
        where: { userId, completedAt: { not: null } },
      }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTopicProgress(userId: string, topicId: string) {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId, topicId, completedAt: { not: null } },
      orderBy: { completedAt: 'asc' },
    });

    return {
      totalSessions: sessions.length,
      progress: sessions.map((s) => ({
        date: s.completedAt,
        percentage: Math.round((s.correctAnswers / s.totalQuestions) * 100),
      })),
    };
  }
}
