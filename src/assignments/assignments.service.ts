import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  // ============== TUTOR/ADMIN: Create & Manage ==============

  async createAssignment(
    createdById: string,
    data: {
      topicId: string;
      lessonId?: string;
      title: string;
      description: string;
      type?: string;
      dueDate?: string;
      points?: number;
      requiresLink?: boolean;
      requiresFile?: boolean;
      requiresText?: boolean;
    },
  ) {
    return this.prisma.assignment.create({
      data: {
        topicId: data.topicId,
        lessonId: data.lessonId || null,
        createdById,
        title: data.title,
        description: data.description,
        type: (data.type as any) || 'PROJECT',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        points: data.points || 100,
        requiresLink: data.requiresLink ?? true,
        requiresFile: data.requiresFile ?? false,
        requiresText: data.requiresText ?? false,
      },
    });
  }

  async updateAssignment(id: string, data: any) {
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    return this.prisma.assignment.update({ where: { id }, data });
  }

  async deleteAssignment(id: string) {
    await this.prisma.assignment.delete({ where: { id } });
    return { message: 'Assignment deleted' };
  }

  async getAllAssignments(filters: {
    topicId?: string;
    type?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { topicId, type, isPublished, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (type) where.type = type;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [assignments, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              parent: { select: { name: true } },
            },
          },
          lesson: { select: { id: true, title: true, order: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return {
      assignments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============== STUDENT: View & Submit ==============

  async getCourseAssignmentsForTutor(topicId: string) {
    // Total enrolled students for this course
    const totalEnrolled = await this.prisma.topicEnrollment.count({
      where: { topicId },
    });

    const assignments = await this.prisma.assignment.findMany({
      where: { topicId, isPublished: true },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, avatar: true },
        },
        submissions: {
          select: { status: true },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => {
      const submitted = a.submissions.length;
      const notSubmitted = Math.max(0, totalEnrolled - submitted);
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
        title: a.title,
        description: a.description,
        type: a.type,
        dueDate: a.dueDate,
        points: a.points,
        requiresLink: a.requiresLink,
        requiresFile: a.requiresFile,
        requiresText: a.requiresText,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        stats: {
          totalEnrolled,
          submitted,
          notSubmitted,
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
  }

  async getCourseAssignments(topicId: string, userId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: { topicId, isPublished: true },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, avatar: true },
        },
        submissions: { where: { studentId: userId }, take: 1 },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      dueDate: a.dueDate,
      points: a.points,
      requiresLink: a.requiresLink,
      requiresFile: a.requiresFile,
      requiresText: a.requiresText,
      createdBy: a.createdBy,
      totalSubmissions: a._count.submissions,
      mySubmission: a.submissions[0] || null,
      createdAt: a.createdAt,
    }));
  }

  async getAssignmentDetail(id: string, userId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, avatar: true },
        },
        lesson: { select: { id: true, title: true, order: true } },
        submissions: { where: { studentId: userId }, take: 1 },
      },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    return {
      ...assignment,
      mySubmission: assignment.submissions[0] || null,
      submissions: undefined,
    };
  }

  async submitAssignment(
    assignmentId: string,
    studentId: string,
    data: {
      link?: string;
      files?: Array<{
        url: string;
        fileName: string;
        fileType: string;
        fileSize?: number;
      }>;
      text?: string;
    },
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const existing = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });

    if (
      existing &&
      existing.status !== 'REJECTED' &&
      existing.status !== 'RESUBMIT'
    ) {
      throw new ForbiddenException(
        'Already submitted. Wait for review or resubmit if rejected.',
      );
    }

    if (existing) {
      return this.prisma.submission.update({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        data: {
          link: data.link,
          files: (data.files || []) as any,
          text: data.text,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    }

    return this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        link: data.link,
        files: (data.files || []) as any,
        text: data.text,
        status: 'SUBMITTED',
      },
    });
  }

  // ============== TUTOR: Review Submissions ==============

  async getSubmissionsForAssignment(
    assignmentId: string,
    tutorId: string,
    isAdmin: boolean,
    status?: string,
  ) {
    // Verify assignment exists and get its topicId for auth check
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        topicId: true,
        title: true,
        description: true,
        type: true,
        points: true,
        dueDate: true,
        requiresLink: true,
        requiresFile: true,
        requiresText: true,
      },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    // Authorization: tutors scoped to assigned courses only
    if (!isAdmin) {
      const assigned = await this.prisma.courseTutor.findUnique({
        where: {
          userId_topicId: { userId: tutorId, topicId: assignment.topicId },
        },
      });
      if (!assigned)
        throw new ForbiddenException('You are not assigned to this course');
    }

    const where: any = { assignmentId };
    if (status) where.status = status;

    const submissions = await this.prisma.submission.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return { assignment, submissions };
  }

  async getSubmissionsForReview(
    topicId: string,
    tutorId: string,
    isAdmin: boolean,
    status?: string,
  ) {
    // Authorization: tutors can only view courses they're assigned to
    if (!isAdmin) {
      const assigned = await this.prisma.courseTutor.findUnique({
        where: { userId_topicId: { userId: tutorId, topicId } },
      });
      if (!assigned)
        throw new ForbiddenException('You are not assigned to this course');
    }

    const where: any = { assignment: { topicId } };
    if (status) where.status = status;

    return this.prisma.submission.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            points: true,
            type: true,
            topic: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getMyReviewQueue(tutorId: string) {
    // Get all courses this tutor is assigned to
    const assignments = await this.prisma.courseTutor.findMany({
      where: { userId: tutorId },
      select: { topicId: true },
    });
    const topicIds = assignments.map((a) => a.topicId);

    if (topicIds.length === 0) return [];

    return this.prisma.submission.findMany({
      where: {
        status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        assignment: { topicId: { in: topicIds } },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            points: true,
            type: true,
            topic: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'asc' }, // oldest first — review in order
    });
  }

  async getMyReviewHistory(tutorId: string, page = 1, limit = 20) {
    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        where: {
          reviewedById: tutorId,
          status: { in: ['APPROVED', 'REJECTED', 'RESUBMIT'] },
        },
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
              id: true,
              title: true,
              points: true,
              type: true,
              topic: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { reviewedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.submission.count({
        where: {
          reviewedById: tutorId,
          status: { in: ['APPROVED', 'REJECTED', 'RESUBMIT'] },
        },
      }),
    ]);

    return {
      submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    data: {
      status: string;
      score?: number;
      feedback?: string;
    },
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: data.status as any,
        score: data.score,
        feedback: data.feedback,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Award XP if approved
    if (data.status === 'APPROVED') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: submission.studentId },
      });
      if (profile) {
        const xpGain = Math.round((data.score || 80) / 2);
        await this.prisma.studentProfile.update({
          where: { userId: submission.studentId },
          data: { xp: profile.xp + xpGain },
        });
      }
    }

    return updated;
  }

  async getMySubmissions(userId: string) {
    return this.prisma.submission.findMany({
      where: { studentId: userId },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            points: true,
            type: true,
            topic: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getMyProjects(userId: string) {
    const enrollments = await this.prisma.topicEnrollment.findMany({
      where: { userId },
      select: { topicId: true },
    });
    const enrolledTopicIds = enrollments.map((e) => e.topicId);

    const assignments = await this.prisma.assignment.findMany({
      where: {
        topicId: { in: enrolledTopicIds },
        type: 'PROJECT',
        isPublished: true,
      },
      include: {
        topic: { select: { name: true, imageUrl: true } },
        lesson: { select: { id: true, title: true, order: true } },
        createdBy: {
          select: { firstName: true, lastName: true, avatar: true },
        },
        submissions: { where: { studentId: userId }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      dueDate: a.dueDate,
      points: a.points,
      courseName: a.topic.name,
      courseIcon: a.topic.imageUrl,
      lesson: a.lesson,
      createdBy: a.createdBy,
      isSubmitted: a.submissions.length > 0,
      submission: a.submissions[0]
        ? {
            status: a.submissions[0].status,
            score: a.submissions[0].score,
            feedback: a.submissions[0].feedback,
            submittedAt: a.submissions[0].submittedAt,
          }
        : null,
    }));
  }
}

// Add this to the class - will be appended and class closing brace removed
