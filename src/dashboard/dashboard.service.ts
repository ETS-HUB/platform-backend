import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStudentDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        profile: {
          select: {
            goal: true,
            trackSlug: true,
            experienceLevel: true,
            learningStyle: true,
            weeklyHours: true,
            xp: true,
            level: true,
            aiSkillReport: true,
            aiLearningPath: true,
          },
        },
      },
    });

    // Get enrolled courses with progress
    const enrolledCourses = await this.getEnrolledCourses(userId);

    // Get assessment summary
    const assessmentSummary = await this.getAssessmentSummary(userId);

    // Get suggested courses
    const suggestedCourses = await this.getSuggestedCourses(userId);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(userId);

    // Level info
    const levelInfo = this.getLevelInfo(
      user?.profile?.xp || 0,
      user?.profile?.level || 1,
    );

    return {
      user: {
        ...user,
        levelInfo,
      },
      enrolledCourses,
      assessmentSummary,
      suggestedCourses,
      recentActivity,
      stats: {
        totalCoursesEnrolled: enrolledCourses.length,
        coursesCompleted: enrolledCourses.filter((c) => c.percentage === 100)
          .length,
        coursesInProgress: enrolledCourses.filter(
          (c) => c.percentage > 0 && c.percentage < 100,
        ).length,
        totalLessonsCompleted: enrolledCourses.reduce(
          (sum, c) => sum + c.completedLessons,
          0,
        ),
      },
    };
  }

  async getCoursesPageData(userId: string) {
    const enrolledCourses = await this.getEnrolledCourses(userId);
    const assessmentSummary = await this.getAssessmentSummary(userId);
    const suggestedCourses = await this.getSuggestedCourses(userId);
    const recentActivity = await this.getRecentActivity(userId);

    return {
      enrolledCourses,
      assessmentSummary,
      suggestedCourses,
      recentActivity,
      stats: {
        totalCoursesEnrolled: enrolledCourses.length,
        coursesCompleted: enrolledCourses.filter((c) => c.percentage === 100)
          .length,
        coursesInProgress: enrolledCourses.filter(
          (c) => c.percentage > 0 && c.percentage < 100,
        ).length,
        totalLessonsCompleted: enrolledCourses.reduce(
          (sum, c) => sum + c.completedLessons,
          0,
        ),
      },
    };
  }

  async getEnrolledCourses(userId: string) {
    const enrollments = await this.prisma.topicEnrollment.findMany({
      where: { userId },
      include: {
        topic: {
          include: {
            parent: { select: { id: true, name: true } },
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                duration: true,
                contentBlocks: {
                  orderBy: { order: 'asc' },
                  select: {
                    type: true,
                    content: true,
                    title: true,
                    overview: true,
                    metadata: true,
                  },
                },
              },
            },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Get user's lesson progress for all enrolled courses
    const allLessonIds = enrollments.flatMap((e) =>
      e.topic.lessons.map((l) => l.id),
    );
    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessonIds } },
    });
    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

    return enrollments.map((enrollment) => {
      const course = enrollment.topic;
      const lessons = course.lessons;
      const completedLessons = lessons.filter(
        (l) => progressMap.get(l.id)?.completed,
      ).length;
      const totalLessons = lessons.length;
      const percentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      // Determine status
      let status: 'not_started' | 'in_progress' | 'completed';
      if (completedLessons === 0) status = 'not_started';
      else if (completedLessons === totalLessons) status = 'completed';
      else status = 'in_progress';

      // Find next lesson (first incomplete)
      const nextLessonRaw =
        lessons.find((l) => !progressMap.get(l.id)?.completed) || null;

      // Extract video and content info from next lesson
      let nextLesson: any = null;
      if (nextLessonRaw) {
        const videoBlock = nextLessonRaw.contentBlocks.find(
          (b) => b.type === 'VIDEO',
        );
        const textBlock = nextLessonRaw.contentBlocks.find(
          (b) => b.type === 'TEXT',
        );

        nextLesson = {
          id: nextLessonRaw.id,
          title: nextLessonRaw.title,
          order: nextLessonRaw.order,
          duration: nextLessonRaw.duration,
          video: videoBlock
            ? {
                url: videoBlock.content,
                title: videoBlock.title,
                overview: videoBlock.overview,
                duration: (videoBlock.metadata as any)?.duration || null,
                provider: (videoBlock.metadata as any)?.provider || null,
              }
            : null,
          overview:
            textBlock?.overview ||
            textBlock?.content?.substring(0, 200) ||
            null,
          contentTypes: [
            ...new Set(nextLessonRaw.contentBlocks.map((b) => b.type)),
          ],
          totalBlocks: nextLessonRaw.contentBlocks.length,
        };
      }

      return {
        courseId: course.id,
        courseName: course.name,
        courseDescription: course.description,
        courseIcon: course.imageUrl,
        coverImage: course.coverImage,
        category: course.parent ? course.parent.name : null,
        enrolledAt: enrollment.enrolledAt,
        totalEnrolled: course._count.enrollments,
        totalLessons,
        completedLessons,
        percentage,
        status,
        nextLesson,
        estimatedMinutesRemaining: lessons
          .filter((l) => !progressMap.get(l.id)?.completed)
          .reduce((sum, l) => sum + (l.duration || 10), 0),
      };
    });
  }

  async getCourseDetail(userId: string, courseId: string) {
    const course = await this.prisma.topic.findUnique({
      where: { id: courseId },
      include: {
        parent: { select: { id: true, name: true } },
        lessons: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            duration: true,
            _count: { select: { contentBlocks: true, questions: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) return null;

    // Get progress
    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: course.lessons.map((l) => l.id) } },
    });
    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

    // Get enrollment status
    const enrollment = await this.prisma.topicEnrollment.findUnique({
      where: { userId_topicId: { userId, topicId: courseId } },
    });

    // Check bookmark status
    const bookmark = await this.prisma.courseBookmark.findUnique({
      where: { userId_topicId: { userId, topicId: courseId } },
    });

    // Check certificate status
    const certificate = await this.prisma.courseCertificate.findUnique({
      where: { userId_topicId: { userId, topicId: courseId } },
    });

    // Get tutors
    const tutors = await this.prisma.courseTutor.findMany({
      where: { topicId: courseId },
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

    // Get enrolled students (preview)
    const enrolledStudents = await this.prisma.topicEnrollment.findMany({
      where: { topicId: courseId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      take: 10,
      orderBy: { enrolledAt: 'desc' },
    });

    const totalLessons = course.lessons.length;
    const completedLessons = course.lessons.filter(
      (l) => progressMap.get(l.id)?.completed,
    ).length;

    // Categorize lessons
    const completedLessonsList = course.lessons.filter(
      (l) => progressMap.get(l.id)?.completed,
    );
    const nextLesson = course.lessons.find(
      (l) => !progressMap.get(l.id)?.completed,
    );
    const ongoingLesson = nextLesson; // The one they should be on
    const upcomingLessons = course.lessons.filter(
      (l) => !progressMap.get(l.id)?.completed && l.id !== nextLesson?.id,
    );

    return {
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        icon: course.imageUrl,
        coverImage: course.coverImage,
        category: course.parent?.name || null,
        track: course.track,
        totalEnrolled: course._count.enrollments,
        totalLessons,
        totalDuration: course.lessons.reduce(
          (sum, l) => sum + (l.duration || 10),
          0,
        ),
      },
      enrollment: enrollment
        ? { enrolled: true, enrolledAt: enrollment.enrolledAt }
        : { enrolled: false },
      isBookmarked: !!bookmark,
      certificate: certificate
        ? {
            issued: true,
            certificateId: certificate.certificateId,
            grade: certificate.overallGrade,
            issuedAt: certificate.issuedAt,
          }
        : { issued: false },
      certificateCriteria: {
        minQuizScore: (course as any).minQuizScore || 60,
        requirements: [
          {
            key: 'lessons',
            label: 'Complete all lessons',
            description: `Finish all ${totalLessons} lessons in this course`,
          },
          {
            key: 'projects',
            label: 'All projects approved',
            description: 'Submit and get tutor approval on all assignments',
          },
          {
            key: 'quizScore',
            label: `Average quiz score ≥ ${(course as any).minQuizScore || 60}%`,
            description:
              'Maintain the minimum average across all lesson quizzes',
          },
        ],
      },
      tutors: tutors.map((t) => ({
        id: t.user.id,
        firstName: t.user.firstName,
        lastName: t.user.lastName,
        avatar: t.user.avatar,
        email: t.user.email,
        assignedAt: t.assignedAt,
      })),
      progress: {
        completedLessons,
        totalLessons,
        percentage:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
      },
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            title: nextLesson.title,
            order: nextLesson.order,
            duration: nextLesson.duration,
            contentBlocks: nextLesson._count.contentBlocks,
            questions: nextLesson._count.questions,
          }
        : null,
      lessons: {
        completed: completedLessonsList.map((l) => ({
          ...l,
          score: progressMap.get(l.id)?.score,
          completedAt: progressMap.get(l.id)?.completedAt,
        })),
        ongoing: ongoingLesson
          ? {
              id: ongoingLesson.id,
              title: ongoingLesson.title,
              order: ongoingLesson.order,
              duration: ongoingLesson.duration,
            }
          : null,
        upcoming: upcomingLessons.map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order,
          duration: l.duration,
        })),
      },
      enrolledStudents: {
        preview: enrolledStudents.map((e) => ({
          id: e.user.id,
          firstName: e.user.firstName,
          lastName: e.user.lastName,
          avatar: e.user.avatar,
        })),
        total: course._count.enrollments,
      },
    };
  }

  async getSuggestedCourses(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { goal: true, trackSlug: true },
    });

    // Get already enrolled topic IDs
    const enrolled = await this.prisma.topicEnrollment.findMany({
      where: { userId },
      select: { topicId: true },
    });
    const enrolledIds = enrolled.map((e) => e.topicId);

    // Find courses matching user's track/goal, not already enrolled
    const where: any = {
      id: { notIn: enrolledIds },
      parentId: { not: null }, // only child topics (courses, not categories)
      lessons: { some: { isPublished: true } }, // has at least one published lesson
    };

    if (profile?.goal) {
      // Use trackSlug directly if available, fallback to name lookup
      if ((profile as any).trackSlug) {
        where.OR = [{ track: (profile as any).trackSlug }, { track: null }];
      } else {
        const track = await this.prisma.track.findFirst({
          where: { name: profile.goal, isActive: true },
        });
        if (track) {
          where.OR = [{ track: track.slug }, { track: null }];
        }
      }
    }

    const suggested = await this.prisma.topic.findMany({
      where,
      include: {
        parent: { select: { name: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    return suggested.map((course) => ({
      courseId: course.id,
      courseName: course.name,
      courseDescription: course.description,
      courseIcon: course.imageUrl,
      coverImage: course.coverImage,
      category: course.parent?.name || null,
      track: course.track,
      totalLessons: course._count.lessons,
      totalEnrolled: course._count.enrollments,
    }));
  }

  private async getAssessmentSummary(userId: string) {
    const latestAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      include: { config: { select: { name: true, track: true } } },
    });

    const totalAttempts = await this.prisma.assessmentAttempt.count({
      where: { userId, completedAt: { not: null } },
    });

    if (!latestAttempt) return { taken: false, totalAttempts: 0 };

    return {
      taken: true,
      totalAttempts,
      latest: {
        score: Math.round(latestAttempt.percentageScore || 0),
        assessmentName: latestAttempt.config.name,
        track: latestAttempt.config.track,
        completedAt: latestAttempt.completedAt,
        topicScores: latestAttempt.topicScores,
      },
    };
  }

  private async getRecentActivity(userId: string) {
    const recentLessons = await this.prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      include: {
        lesson: { select: { title: true, topicId: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    const recentPractice = await this.prisma.practiceSession.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    return {
      lessons: recentLessons.map((p) => ({
        type: 'lesson_completed',
        title: p.lesson.title,
        score: p.score,
        completedAt: p.completedAt,
      })),
      practice: recentPractice.map((s) => ({
        type: 'practice_session',
        correctAnswers: s.correctAnswers,
        totalQuestions: s.totalQuestions,
        completedAt: s.completedAt,
      })),
    };
  }

  private getLevelInfo(xp: number, level: number) {
    const levelNames: Record<number, string> = {
      1: 'Explorer',
      10: 'Builder',
      20: 'Engineer',
      35: 'Senior Developer',
      50: 'Tech Mentor',
    };

    const thresholds = [
      { level: 10, xp: 500 },
      { level: 20, xp: 1500 },
      { level: 35, xp: 3000 },
      { level: 50, xp: 5000 },
    ];

    const nextLevel = thresholds.find((t) => t.xp > xp);

    return {
      level,
      levelName: levelNames[level] || `Level ${level}`,
      xp,
      nextLevel: nextLevel
        ? {
            level: nextLevel.level,
            name: levelNames[nextLevel.level],
            xpRequired: nextLevel.xp,
            xpRemaining: nextLevel.xp - xp,
            progress: Math.round((xp / nextLevel.xp) * 100),
          }
        : null,
    };
  }
}
