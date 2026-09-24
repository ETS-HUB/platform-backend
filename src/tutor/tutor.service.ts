import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TutorService {
  constructor(private prisma: PrismaService) {}

  async getTutorCourseDetail(tutorId: string, topicId: string) {
    // Verify tutor is assigned to this course
    const assignment = await this.prisma.courseTutor.findUnique({
      where: { userId_topicId: { userId: tutorId, topicId } },
    });
    if (!assignment) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('You are not assigned to this course');
    }

    // Course info
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        parent: { select: { id: true, name: true } },
        _count: {
          select: { enrollments: true, lessons: true, assignments: true },
        },
      },
    });

    if (!topic) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Course not found');
    }

    // All published lessons
    const lessons = await this.prisma.lesson.findMany({
      where: { topicId, isPublished: true },
      select: {
        id: true,
        title: true,
        order: true,
        duration: true,
        isProject: true,
        _count: { select: { contentBlocks: true, questions: true } },
      },
      orderBy: { order: 'asc' },
    });

    // Draft lessons (only visible to tutor/admin)
    const draftLessons = await this.prisma.lesson.findMany({
      where: { topicId, isPublished: false },
      select: { id: true, title: true, order: true, duration: true },
      orderBy: { order: 'asc' },
    });

    // Co-tutors on this course
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

    // Assignment submission stats
    const assignments = await this.prisma.assignment.findMany({
      where: { topicId, isPublished: true },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        submissions: { select: { status: true } },
      },
    });

    const totalEnrolled = topic._count.enrollments;

    const assignmentStats = assignments.map((a) => {
      const submitted = a.submissions.length;
      const pending = a.submissions.filter(
        (s) => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW',
      ).length;
      const approved = a.submissions.filter(
        (s) => s.status === 'APPROVED',
      ).length;
      const rejected = a.submissions.filter(
        (s) => s.status === 'REJECTED' || s.status === 'RESUBMIT',
      ).length;

      return {
        id: a.id,
        topicId: a.topicId,
        lessonId: a.lessonId,
        title: a.title,
        description: a.description,
        type: a.type,
        points: a.points,
        dueDate: a.dueDate,
        requiresLink: a.requiresLink,
        requiresFile: a.requiresFile,
        requiresText: a.requiresText,
        isPublished: a.isPublished,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        stats: {
          totalEnrolled,
          submitted,
          notSubmitted: Math.max(0, totalEnrolled - submitted),
          pending,
          approved,
          rejected,
          submissionRate:
            totalEnrolled > 0
              ? Math.round((submitted / totalEnrolled) * 100)
              : 0,
        },
      };
    });

    // Overall pending reviews count
    const pendingReviews = assignmentStats.reduce(
      (sum, a) => sum + a.stats.pending,
      0,
    );

    return {
      course: {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        imageUrl: topic.imageUrl,
        coverImage: topic.coverImage,
        track: topic.track,
        category: topic.parent?.name || null,
        isSequential: topic.isSequential,
        minQuizScore: topic.minQuizScore,
        createdAt: topic.createdAt,
      },
      stats: {
        totalEnrolled,
        totalLessons: topic._count.lessons,
        publishedLessons: lessons.length,
        draftLessons: draftLessons.length,
        totalAssignments: topic._count.assignments,
        pendingReviews,
      },
      tutors: tutors.map((t) => ({ ...t.user, assignedAt: t.assignedAt })),
      lessons,
      draftLessons,
      assignments: assignmentStats,
    };
  }

  async getMyCourses(tutorId: string) {
    const assignments = await this.prisma.courseTutor.findMany({
      where: { userId: tutorId },
      include: {
        topic: {
          include: {
            parent: { select: { id: true, name: true } },
            _count: {
              select: { enrollments: true, lessons: true, assignments: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // For each course, count pending submissions
    const result = await Promise.all(
      assignments.map(async (a) => {
        const pendingSubmissions = await this.prisma.submission.count({
          where: {
            status: { in: ['SUBMITTED', 'IN_REVIEW'] },
            assignment: { topicId: a.topicId },
          },
        });

        return {
          topicId: a.topic.id,
          topicName: a.topic.name,
          description: a.topic.description,
          coverImage: a.topic.coverImage,
          track: a.topic.track,
          category: a.topic.parent?.name || null,
          assignedAt: a.assignedAt,
          studentCount: a.topic._count.enrollments,
          lessonCount: a.topic._count.lessons,
          assignmentCount: a.topic._count.assignments,
          pendingSubmissions,
        };
      }),
    );

    return result;
  }

  async getTutorDashboard(tutorId: string) {
    // 1. Assigned courses
    const courses = await this.getMyCourses(tutorId);

    // 2. Pending review count (across all courses)
    const topicIds = courses.map((c) => c.topicId);
    const pendingReviews = topicIds.length
      ? await this.prisma.submission.count({
          where: {
            status: { in: ['SUBMITTED', 'IN_REVIEW'] },
            assignment: { topicId: { in: topicIds } },
          },
        })
      : 0;

    // 3. Unread messages
    const unreadMessages = await this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: tutorId },
        conversation: {
          OR: [{ participantOneId: tutorId }, { participantTwoId: tutorId }],
        },
      },
    });

    // 4. Recent activity — last 10 submissions across assigned courses
    const recentSubmissions = topicIds.length
      ? await this.prisma.submission.findMany({
          where: { assignment: { topicId: { in: topicIds } } },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            assignment: {
              select: {
                title: true,
                topic: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
          take: 10,
        })
      : [];

    // 5. Reviews done by this tutor this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const reviewedThisWeek = await this.prisma.submission.count({
      where: {
        reviewedById: tutorId,
        reviewedAt: { gte: weekAgo },
      },
    });

    return {
      assignedCourseCount: courses.length,
      pendingReviews,
      unreadMessages,
      reviewedThisWeek,
      courses,
      recentActivity: recentSubmissions.map((s) => ({
        submissionId: s.id,
        status: s.status,
        student: s.student,
        assignmentTitle: s.assignment.title,
        course: s.assignment.topic,
        submittedAt: s.submittedAt,
      })),
    };
  }
}
