import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateQuestionDto,
  CreateTopicDto,
  SubmitAnswerDto,
  CreateAssessmentConfigDto,
  BulkUploadQuestionsDto,
} from './dto';

@Injectable()
export class AssessmentService {
  constructor(private prisma: PrismaService) {}

  async createTopic(dto: CreateTopicDto) {
    if (dto.parentId) {
      const parent = await this.prisma.topic.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const { tutorIds, ...topicData } = dto;

    const topic = await this.prisma.topic.create({ data: topicData });

    // Assign tutors if provided
    if (tutorIds && tutorIds.length > 0) {
      for (const tutorId of tutorIds) {
        const user = await this.prisma.user.findUnique({
          where: { id: tutorId },
        });
        if (user && (user.role === 'TUTOR' || user.role === 'ADMIN')) {
          await this.prisma.courseTutor.create({
            data: { userId: tutorId, topicId: topic.id },
          });
        }
      }
    }

    return topic;
  }

  async updateTopic(id: string, data: any) {
    return this.prisma.topic.update({ where: { id }, data });
  }

  async deleteTopic(id: string) {
    await this.prisma.topic.delete({ where: { id } });
    return { message: 'Topic deleted' };
  }

  async getAllTopics() {
    // Return only top-level categories with their courses nested inside
    return this.prisma.topic.findMany({
      where: { parentId: null },
      include: {
        _count: { select: { questions: true } },
        children: {
          include: {
            _count: { select: { questions: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ============== QUESTIONS (Admin) ==============

  async createQuestion(dto: CreateQuestionDto) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
    });
    if (!topic) throw new NotFoundException('Topic not found');

    return this.prisma.question.create({
      data: {
        topicId: dto.topicId,
        difficulty: dto.difficulty,
        text: dto.text,
        options: dto.options as any,
        explanation: dto.explanation,
        points: dto.points || 10,
        timeLimit: dto.timeLimit,
      },
    });
  }

  async bulkUploadQuestions(dto: BulkUploadQuestionsDto) {
    const results: any[] = [];
    for (const question of dto.questions) {
      const created = await this.createQuestion(question);
      results.push(created);
    }
    return { uploaded: results.length, questions: results };
  }

  async getQuestions(filters: {
    topicId?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }) {
    const { topicId, difficulty, page = 1, limit = 50 } = filters;

    const where: any = { isActive: true };
    if (topicId) where.topicId = topicId;
    if (difficulty) where.difficulty = difficulty;

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { topic: { select: { name: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      questions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateQuestion(id: string, dto: Partial<CreateQuestionDto>) {
    const data: any = { ...dto };
    if (dto.options) {
      data.options = dto.options as any;
    }
    return this.prisma.question.update({ where: { id }, data });
  }

  async deleteQuestion(id: string) {
    return this.prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============== ASSESSMENT CONFIGS ==============

  async createConfig(dto: CreateAssessmentConfigDto) {
    return this.prisma.assessmentConfig.create({ data: dto });
  }

  async updateConfig(id: string, data: any) {
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    return this.prisma.assessmentConfig.update({ where: { id }, data });
  }

  async deleteConfig(id: string) {
    await this.prisma.assessmentConfig.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Config deactivated' };
  }

  async getConfigs(track?: string) {
    const where: any = { isActive: true };
    if (track) where.track = track;

    return this.prisma.assessmentConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfigForTrack(track: string, isBoothMode = false) {
    return this.prisma.assessmentConfig.findFirst({
      where: { track, isBoothMode, isActive: true },
    });
  }

  // ============== TAKING AN ASSESSMENT ==============

  async startAssessment(userId: string, configId: string) {
    const config = await this.prisma.assessmentConfig.findUnique({
      where: { id: configId },
    });

    if (!config) throw new NotFoundException('Assessment config not found');

    // Build question selection
    const questions = await this.selectQuestions(config);

    // Create attempt
    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        userId,
        configId,
      },
    });

    return {
      attemptId: attempt.id,
      timeLimitMinutes: config.timeLimitMinutes,
      totalQuestions: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: (q.options as any[]).map((o) => ({ id: o.id, text: o.text })),
        topic: q.topic.name,
        difficulty: q.difficulty,
        points: q.points,
        timeLimit: q.timeLimit,
      })),
    };
  }

  async submitAnswer(attemptId: string, userId: string, dto: SubmitAnswerDto) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId, completedAt: null },
    });

    if (!attempt) {
      throw new BadRequestException(
        'Assessment not found or already completed',
      );
    }

    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) throw new NotFoundException('Question not found');

    const options = question.options as any[];
    const correctOption = options.find((o) => o.isCorrect);
    const isCorrect = correctOption?.id === dto.selectedOption;

    return this.prisma.answerRecord.create({
      data: {
        attemptId,
        questionId: dto.questionId,
        selectedOption: dto.selectedOption,
        isCorrect,
        timeTaken: dto.timeTaken,
      },
    });
  }

  async completeAssessment(attemptId: string, userId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId, completedAt: null },
      include: {
        answers: { include: { question: { include: { topic: true } } } },
        config: true,
      },
    });

    if (!attempt) {
      throw new BadRequestException(
        'Assessment not found or already completed',
      );
    }

    // Calculate scores
    const totalScore = attempt.answers.reduce(
      (sum, a) => sum + (a.isCorrect ? a.question.points : 0),
      0,
    );
    const maxScore = attempt.answers.reduce(
      (sum, a) => sum + a.question.points,
      0,
    );
    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Calculate topic scores
    const topicScores: Record<
      string,
      { topicName: string; correct: number; total: number; percentage: number }
    > = {};

    for (const answer of attempt.answers) {
      const topicId = answer.question.topicId;
      const topicName = answer.question.topic.name;

      if (!topicScores[topicId]) {
        topicScores[topicId] = {
          topicName,
          correct: 0,
          total: 0,
          percentage: 0,
        };
      }

      topicScores[topicId].total++;
      if (answer.isCorrect) topicScores[topicId].correct++;
    }

    // Calculate percentages
    for (const topicId of Object.keys(topicScores)) {
      const ts = topicScores[topicId];
      ts.percentage = ts.total > 0 ? (ts.correct / ts.total) * 100 : 0;
    }

    // Update attempt
    const completed = await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        totalScore,
        maxScore,
        percentageScore,
        topicScores,
      },
    });

    // Award XP
    await this.awardXp(userId, Math.round(percentageScore / 2) + 20);

    // Make profile visible to recruiters
    await this.prisma.studentProfile.updateMany({
      where: { userId },
      data: { isVisibleToRecruiters: true },
    });

    return {
      attemptId: completed.id,
      totalScore,
      maxScore,
      percentageScore: Math.round(percentageScore * 10) / 10,
      topicScores,
      completedAt: completed.completedAt,
    };
  }

  async getAttemptResults(attemptId: string, userId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: {
          include: { question: { include: { topic: true } } },
        },
        config: true,
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');

    return attempt;
  }

  async getUserAttempts(userId: string, page = 1, limit = 20) {
    const [attempts, total] = await Promise.all([
      this.prisma.assessmentAttempt.findMany({
        where: { userId, completedAt: { not: null } },
        include: { config: { select: { name: true } } },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assessmentAttempt.count({
        where: { userId, completedAt: { not: null } },
      }),
    ]);

    return {
      attempts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get percentile rank for a user's score
  async getPercentile(userId: string, attemptId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
    });

    if (!attempt || !attempt.percentageScore) {
      throw new NotFoundException('Completed attempt not found');
    }

    const totalCompleted = await this.prisma.assessmentAttempt.count({
      where: { completedAt: { not: null } },
    });

    const belowCount = await this.prisma.assessmentAttempt.count({
      where: {
        completedAt: { not: null },
        percentageScore: { lt: attempt.percentageScore },
      },
    });

    const percentile =
      totalCompleted > 0 ? Math.round((belowCount / totalCompleted) * 100) : 50;

    return {
      percentageScore: attempt.percentageScore,
      percentile,
      totalCandidates: totalCompleted,
    };
  }

  // ============== PRIVATE HELPERS ==============

  private async selectQuestions(config: any) {
    const topicDistribution = config.topicDistribution as Record<
      string,
      number
    > | null;
    const difficultyDistribution = config.difficultyDistribution as Record<
      string,
      number
    > | null;

    if (topicDistribution && Object.keys(topicDistribution).length > 0) {
      // Select by topic distribution
      const questions: any[] = [];
      for (const [topicId, count] of Object.entries(topicDistribution)) {
        const where: any = { topicId, isActive: true };
        // If config has an overall difficulty, filter by it
        if (config.difficulty) {
          where.difficulty = config.difficulty;
        }

        const topicQuestions = await this.prisma.question.findMany({
          where,
          include: { topic: { select: { name: true } } },
          take: count,
          orderBy: { createdAt: 'asc' },
        });
        questions.push(...topicQuestions);
      }
      return this.shuffle(questions);
    }

    if (
      difficultyDistribution &&
      Object.keys(difficultyDistribution).length > 0
    ) {
      // Select by difficulty distribution
      const questions: any[] = [];
      for (const [difficulty, count] of Object.entries(
        difficultyDistribution,
      )) {
        const diffQuestions = await this.prisma.question.findMany({
          where: { difficulty: difficulty as any, isActive: true },
          include: { topic: { select: { name: true } } },
          take: count,
        });
        questions.push(...diffQuestions);
      }
      return this.shuffle(questions);
    }

    // Fallback: random selection across all topics
    const where: any = { isActive: true };
    if (config.difficulty) {
      where.difficulty = config.difficulty;
    }

    const questions = await this.prisma.question.findMany({
      where,
      include: { topic: { select: { name: true } } },
      take: config.totalQuestions,
    });

    return this.shuffle(questions);
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async awardXp(userId: string, xp: number) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) return;

    const newXp = profile.xp + xp;
    const newLevel = this.calculateLevel(newXp);

    await this.prisma.studentProfile.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    });
  }

  private calculateLevel(xp: number): number {
    if (xp >= 5000) return 50; // Tech Mentor
    if (xp >= 3000) return 35; // Senior Developer
    if (xp >= 1500) return 20; // Engineer
    if (xp >= 500) return 10; // Builder
    return 1; // Explorer
  }
}
``