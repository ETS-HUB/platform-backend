import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  // ============== ADMIN: Create & Manage Lessons ==============

  async createLesson(dto: CreateLessonDto, createdById?: string) {
    const { contentBlocks, questions, ...lessonData } = dto;

    // Tutors create as draft (isPublished: false), admin can publish directly
    const lesson = await this.prisma.lesson.create({
      data: {
        ...lessonData,
        isPublished: lessonData.isPublished ?? false, // default to draft
        contentBlocks: contentBlocks
          ? {
              create: contentBlocks.map((b) => ({
                ...b,
                metadata: b.metadata || undefined,
              })),
            }
          : undefined,
        questions: questions
          ? {
              create: questions.map((q) => ({
                ...q,
                options: q.options as any,
              })),
            }
          : undefined,
      },
      include: {
        contentBlocks: { orderBy: { order: 'asc' } },
        questions: { orderBy: { order: 'asc' } },
      },
    });

    // Auto-create an Assignment for any PROJECT content block
    if (createdById) {
      // Verify topic exists before attempting assignment creation
      const topic = await this.prisma.topic.findUnique({
        where: { id: lessonData.topicId },
      });
      if (!topic)
        throw new NotFoundException(`Topic ${lessonData.topicId} not found`);

      const projectBlocks = (contentBlocks || []).filter(
        (b) => b.type === 'PROJECT',
      );
      for (const block of projectBlocks) {
        await this.prisma.assignment.create({
          data: {
            topicId: lessonData.topicId,
            lessonId: lesson.id,
            createdById,
            title: block.title || `Project: ${lessonData.title}`,
            description: block.content,
            type: 'PROJECT',
            points: 100,
            requiresLink: true,
          },
        });
      }
    }

    return lesson;
  }

  async updateLesson(id: string, dto: Partial<CreateLessonDto>) {
    const { contentBlocks, questions, ...lessonData } = dto;
    return this.prisma.lesson.update({ where: { id }, data: lessonData });
  }

  async deleteLesson(id: string) {
    await this.prisma.lesson.delete({ where: { id } });
    return { message: 'Lesson deleted' };
  }

  async addContentBlock(lessonId: string, block: any) {
    return this.prisma.contentBlock.create({
      data: {
        lessonId,
        type: block.type,
        order: block.order,
        title: block.title,
        content: block.content,
        overview: block.overview,
        metadata: block.metadata || undefined,
      },
    });
  }

  async updateContentBlock(blockId: string, data: any) {
    return this.prisma.contentBlock.update({ where: { id: blockId }, data });
  }

  async deleteContentBlock(blockId: string) {
    await this.prisma.contentBlock.delete({ where: { id: blockId } });
    return { message: 'Content block deleted' };
  }

  async addLessonQuestion(lessonId: string, question: any) {
    return this.prisma.lessonQuestion.create({
      data: {
        lessonId,
        order: question.order,
        difficulty: question.difficulty,
        text: question.text,
        options: question.options as any,
        explanation: question.explanation,
        points: question.points || 10,
      },
    });
  }

  async deleteLessonQuestion(questionId: string) {
    await this.prisma.lessonQuestion.delete({ where: { id: questionId } });
    return { message: 'Question deleted' };
  }

  async updateLessonQuestion(questionId: string, data: any) {
    if (data.options) data.options = data.options as any;
    return this.prisma.lessonQuestion.update({
      where: { id: questionId },
      data,
    });
  }

  async getAllLessons(filters: {
    topicId?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { topicId, isPublished, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        include: {
          topic: { select: { name: true, parentId: true } },
          _count: { select: { contentBlocks: true, questions: true } },
        },
        orderBy: [{ topicId: 'asc' }, { order: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return {
      lessons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============== TOPICS: Hierarchy + Enrollment ==============

  async getAdminLessonDetail(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            parentId: true,
            parent: { select: { id: true, name: true } },
          },
        },
        contentBlocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: { orderBy: { order: 'asc' } }, // full options incl. isCorrect
          },
        },
        questions: { orderBy: { order: 'asc' } }, // full options incl. isCorrect
        _count: { select: { contentBlocks: true, questions: true } },
      },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    // Get course tutors
    const tutors = await this.prisma.courseTutor.findMany({
      where: { topicId: lesson.topicId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return {
      ...lesson,
      tutors: tutors.map((t) => t.user),
      isLocked: false, // admin always has full access
    };
  }

  async getCategories() {
    const categories = await this.prisma.topic.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
        coverImage: true,
        _count: { select: { children: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Only return categories that actually have courses under them
    return categories.filter((c) => c._count.children > 0);
  }

  async getTopicsWithHierarchy(
    track?: string,
    userId?: string,
    categoryId?: string,
    page = 1,
    limit = 20,
  ) {
    if (categoryId) {
      const childWhere: any = { parentId: categoryId };
      if (track) childWhere.track = track;

      const [children, total] = await Promise.all([
        this.prisma.topic.findMany({
          where: childWhere,
          include: { _count: { select: { lessons: true, enrollments: true } } },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.topic.count({ where: childWhere }),
      ]);

      const category = await this.prisma.topic.findUnique({
        where: { id: categoryId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          coverImage: true,
        },
      });

      const enriched = await this.enrichCoursesWithProgress(children, userId);

      return {
        categories: category
          ? [
              {
                ...category,
                parentId: null,
                children: enriched,
                _count: { lessons: 0, enrollments: 0 },
              },
            ]
          : [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const where: any = { parentId: null };

    const [categories, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        include: {
          children: {
            where: track ? { track } : {},
            include: {
              _count: { select: { lessons: true, enrollments: true } },
            },
            orderBy: { name: 'asc' },
          },
          _count: { select: { lessons: true, enrollments: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where }),
    ]);

    const result = await this.enrichCategoriesWithProgress(categories, userId);

    return {
      categories: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async enrichCoursesWithProgress(courses: any[], userId?: string) {
    if (!userId)
      return courses.map((c) => ({ ...c, isEnrolled: false, progress: null }));

    const enrollments = await this.prisma.topicEnrollment.findMany({
      where: { userId },
      select: { topicId: true },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.topicId));

    const courseIds = courses.map((c) => c.id);
    const lessonsByTopic = await this.prisma.lesson.findMany({
      where: { topicId: { in: courseIds }, isPublished: true },
      select: { id: true, topicId: true },
    });

    const completedProgress = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        completed: true,
        lessonId: { in: lessonsByTopic.map((l) => l.id) },
      },
      select: { lessonId: true },
    });
    const completedLessonIds = new Set(
      completedProgress.map((p) => p.lessonId),
    );

    return courses.map((course) => {
      const courseLessons = lessonsByTopic.filter(
        (l) => l.topicId === course.id,
      );
      const completedCount = courseLessons.filter((l) =>
        completedLessonIds.has(l.id),
      ).length;
      const totalCount = courseLessons.length;

      return {
        ...course,
        isEnrolled: enrolledIds.has(course.id),
        progress: enrolledIds.has(course.id)
          ? {
              completedLessons: completedCount,
              totalLessons: totalCount,
              percentage:
                totalCount > 0
                  ? Math.round((completedCount / totalCount) * 100)
                  : 0,
            }
          : null,
      };
    });
  }

  private async enrichCategoriesWithProgress(
    categories: any[],
    userId?: string,
  ) {
    if (!userId) return categories;

    const allChildIds = categories.flatMap((cat) =>
      cat.children.map((c: any) => c.id),
    );
    const enrichedCourses = await this.enrichCoursesWithProgress(
      categories.flatMap((cat) => cat.children),
      userId,
    );

    const courseMap = new Map(enrichedCourses.map((c) => [c.id, c]));

    return categories.map((category) => ({
      ...category,
      children: category.children.map(
        (course: any) => courseMap.get(course.id) || course,
      ),
    }));
  }

  async enrollInTopic(userId: string, topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) throw new NotFoundException('Topic not found');

    const existing = await this.prisma.topicEnrollment.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });

    if (existing) return existing;

    return this.prisma.topicEnrollment.create({
      data: { userId, topicId },
    });
  }

  async unenrollFromTopic(userId: string, topicId: string) {
    await this.prisma.topicEnrollment.deleteMany({
      where: { userId, topicId },
    });
    return { message: 'Unenrolled' };
  }

  async getTopicEnrolledStudents(topicId: string, page = 1, limit = 20) {
    const [enrollments, total] = await Promise.all([
      this.prisma.topicEnrollment.findMany({
        where: { topicId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topicEnrollment.count({ where: { topicId } }),
    ]);

    return {
      students: enrollments.map((e) => ({
        ...e.user,
        enrolledAt: e.enrolledAt,
      })),
      totalEnrolled: total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============== STUDENT: Browse & Learn ==============

  async getTopicLessons(topicId: string, userId?: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { topicId, isPublished: true },
      include: {
        _count: { select: { contentBlocks: true, questions: true } },
      },
      orderBy: { order: 'asc' },
    });

    if (userId) {
      const progress = await this.prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
      });
      const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

      return lessons.map((lesson) => ({
        ...lesson,
        progress: progressMap.get(lesson.id) || null,
        isCompleted: progressMap.get(lesson.id)?.completed || false,
      }));
    }

    return lessons;
  }

  async getLessonContent(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: { select: { name: true, id: true, parentId: true } },
        contentBlocks: { orderBy: { order: 'asc' } },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            difficulty: true,
            text: true,
            options: true,
            points: true,
          },
        },
      },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async answerLessonQuestion(questionId: string, selectedOption: string) {
    // Try lesson question first
    const lessonQuestion = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
    });

    if (lessonQuestion) {
      const options = lessonQuestion.options as any[];
      const correctOption = options.find((o: any) => o.isCorrect);
      return {
        isCorrect: correctOption?.id === selectedOption,
        correctAnswer: correctOption?.id,
        explanation: lessonQuestion.explanation,
        points:
          correctOption?.id === selectedOption ? lessonQuestion.points : 0,
      };
    }

    // Try content block question
    const blockQuestion = await this.prisma.contentBlockQuestion.findUnique({
      where: { id: questionId },
    });

    if (blockQuestion) {
      const options = blockQuestion.options as any[];
      const correctOption = options.find((o: any) => o.isCorrect);
      return {
        isCorrect: correctOption?.id === selectedOption,
        correctAnswer: correctOption?.id,
        explanation: blockQuestion.explanation,
        points: correctOption?.id === selectedOption ? blockQuestion.points : 0,
      };
    }

    throw new NotFoundException('Question not found');
  }

  async completeLesson(userId: string, lessonId: string, score?: number) {
    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (existing) {
      await this.prisma.lessonProgress.update({
        where: { userId_lessonId: { userId, lessonId } },
        data: {
          completed: true,
          score: score || existing.score,
          completedAt: new Date(),
        },
      });
    } else {
      // Award XP
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (profile) {
        await this.prisma.studentProfile.update({
          where: { userId },
          data: { xp: profile.xp + 20 },
        });
      }

      await this.prisma.lessonProgress.create({
        data: {
          userId,
          lessonId,
          completed: true,
          score,
          completedAt: new Date(),
        },
      });
    }

    // Find the next lesson
    const currentLesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { topicId: true, order: true },
    });

    let nextLesson: any = null;
    if (currentLesson) {
      nextLesson = await this.prisma.lesson.findFirst({
        where: {
          topicId: currentLesson.topicId,
          order: currentLesson.order + 1,
          isPublished: true,
        },
        select: { id: true, title: true, order: true, duration: true },
      });
    }

    return {
      completed: true,
      score: score || null,
      completedAt: new Date(),
      xpEarned: existing ? 0 : 20,
      nextLesson,
    };
  }

  async getMyProgress(userId: string) {
    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId },
      include: {
        lesson: {
          select: { id: true, title: true, topicId: true, order: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Get enrolled topics
    const enrollments = await this.prisma.topicEnrollment.findMany({
      where: { userId },
      include: {
        topic: {
          include: {
            lessons: { where: { isPublished: true }, select: { id: true } },
            parent: { select: { id: true, name: true } },
          },
        },
      },
    });

    const topicProgress = enrollments.map((enrollment) => {
      const topic = enrollment.topic;
      const totalLessons = topic.lessons.length;
      const completedLessons = progress.filter(
        (p) => p.lesson.topicId === topic.id && p.completed,
      ).length;

      return {
        topicId: topic.id,
        topicName: topic.name,
        parentTopic: topic.parent ? topic.parent.name : null,
        totalLessons,
        completedLessons,
        percentage:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
        enrolledAt: enrollment.enrolledAt,
      };
    });

    return {
      topicProgress,
      recentlyCompleted: progress.filter((p) => p.completed).slice(0, 10),
      totalLessonsCompleted: progress.filter((p) => p.completed).length,
    };
  }

  async getTopicProgress(userId: string, topicId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { topicId, isPublished: true },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true, duration: true },
    });

    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
    });

    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

    return {
      topicId,
      totalLessons: lessons.length,
      completedLessons: progress.filter((p) => p.completed).length,
      percentage:
        lessons.length > 0
          ? Math.round(
              (progress.filter((p) => p.completed).length / lessons.length) *
                100,
            )
          : 0,
      lessons: lessons.map((l) => ({
        ...l,
        isCompleted: progressMap.get(l.id)?.completed || false,
        score: progressMap.get(l.id)?.score || null,
        completedAt: progressMap.get(l.id)?.completedAt || null,
      })),
    };
  }

  // ============== BOOKMARKS ==============

  async bookmarkCourse(userId: string, topicId: string) {
    const existing = await this.prisma.courseBookmark.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });
    if (existing) return existing;

    return this.prisma.courseBookmark.create({
      data: { userId, topicId },
    });
  }

  async removeBookmark(userId: string, topicId: string) {
    await this.prisma.courseBookmark.deleteMany({ where: { userId, topicId } });
    return { message: 'Bookmark removed' };
  }

  async getBookmarkedCourses(userId: string) {
    const bookmarks = await this.prisma.courseBookmark.findMany({
      where: { userId },
      include: {
        topic: {
          include: {
            parent: { select: { name: true } },
            _count: { select: { lessons: true, enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map((b) => ({
      courseId: b.topic.id,
      courseName: b.topic.name,
      courseDescription: b.topic.description,
      courseIcon: b.topic.imageUrl,
      coverImage: b.topic.coverImage,
      category: b.topic.parent?.name || null,
      track: b.topic.track,
      totalLessons: b.topic._count.lessons,
      totalEnrolled: b.topic._count.enrollments,
      bookmarkedAt: b.createdAt,
    }));
  }

  // ============== TUTORS ==============

  async assignTutor(tutorId: string, topicId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: tutorId } });
    if (!user || (user.role !== 'TUTOR' && user.role !== 'ADMIN')) {
      throw new NotFoundException('Tutor not found');
    }

    const existing = await this.prisma.courseTutor.findUnique({
      where: { userId_topicId: { userId: tutorId, topicId } },
    });
    if (existing) return existing;

    return this.prisma.courseTutor.create({
      data: { userId: tutorId, topicId },
    });
  }

  async removeTutor(tutorId: string, topicId: string) {
    await this.prisma.courseTutor.deleteMany({
      where: { userId: tutorId, topicId },
    });
    return { message: 'Tutor removed from course' };
  }

  async getCourseTutors(topicId: string) {
    const tutors = await this.prisma.courseTutor.findMany({
      where: { topicId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    return tutors.map((t) => ({ ...t.user, assignedAt: t.assignedAt }));
  }

  // ============== LESSON ACCESS (Sequential Lock) ==============

  async getLessonWithAccessCheck(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          select: { name: true, id: true, parentId: true, isSequential: true },
        },
        contentBlocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                order: true,
                difficulty: true,
                text: true,
                options: true,
                points: true,
              },
            },
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            difficulty: true,
            text: true,
            options: true,
            points: true,
          },
        },
      },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    // Get course tutor(s)
    const tutors = await this.prisma.courseTutor.findMany({
      where: { topicId: lesson.topicId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    // Check if lesson is accessible
    const isUnlocked = await this.isLessonUnlocked(lesson, userId);

    if (!isUnlocked) {
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        duration: lesson.duration,
        topic: lesson.topic,
        tutors: tutors.map((t) => t.user),
        isLocked: true,
        lockReason: 'Complete the previous lesson first',
        contentBlocks: [],
        questions: [],
      };
    }

    return {
      ...lesson,
      tutors: tutors.map((t) => t.user),
      isLocked: false,
      lockReason: null,
    };
  }

  async isLessonUnlocked(lesson: any, userId: string): Promise<boolean> {
    // If course is not sequential, all lessons are accessible
    if (!lesson.topic.isSequential) return true;

    // First lesson is always unlocked
    if (lesson.order <= 1) return true;

    // Check if the previous lesson is completed
    const previousLesson = await this.prisma.lesson.findFirst({
      where: {
        topicId: lesson.topicId,
        order: lesson.order - 1,
        isPublished: true,
      },
    });

    if (!previousLesson) return true; // No previous lesson found, unlock

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: previousLesson.id } },
    });

    return progress?.completed === true;
  }
}
