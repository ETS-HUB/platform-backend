import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async checkEligibility(userId: string, topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) throw new NotFoundException('Course not found');

    // 1. Check all lessons completed
    const lessons = await this.prisma.lesson.findMany({
      where: { topicId, isPublished: true },
      select: { id: true },
    });
    const completedProgress = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessons.map((l) => l.id) },
        completed: true,
      },
    });

    const lessonsCompleted = completedProgress.length;
    const totalLessons = lessons.length;
    const allLessonsDone =
      lessonsCompleted === totalLessons && totalLessons > 0;

    // 2. Check all projects/assignments APPROVED
    const assignments = await this.prisma.assignment.findMany({
      where: { topicId, isPublished: true },
      select: { id: true },
    });
    const approvedSubmissions = await this.prisma.submission.findMany({
      where: {
        studentId: userId,
        assignmentId: { in: assignments.map((a) => a.id) },
        status: 'APPROVED',
      },
    });

    const projectsApproved = approvedSubmissions.length;
    const totalProjects = assignments.length;
    const allProjectsDone =
      totalProjects === 0 || projectsApproved === totalProjects;

    // 3. Check average quiz score
    const scores = completedProgress
      .filter((p) => p.score !== null)
      .map((p) => p.score as number);
    const averageQuizScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
    const minQuizScore = (topic as any).minQuizScore || 60;
    const quizScoreMet = averageQuizScore >= minQuizScore;

    // Check if already issued
    const existingCert = await this.prisma.courseCertificate.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });

    const eligible = allLessonsDone && allProjectsDone && quizScoreMet;

    return {
      eligible,
      issued: !!existingCert,
      issuedAt: existingCert?.issuedAt || null,
      certificateId: existingCert?.certificateId || null,
      criteria: {
        lessonsComplete: {
          done: lessonsCompleted,
          total: totalLessons,
          met: allLessonsDone,
        },
        projectsApproved: {
          done: projectsApproved,
          total: totalProjects,
          met: allProjectsDone,
        },
        averageQuizScore: {
          score: averageQuizScore,
          required: minQuizScore,
          met: quizScoreMet,
        },
      },
    };
  }

  async claimCertificate(userId: string, topicId: string) {
    const eligibility = await this.checkEligibility(userId, topicId);

    if (eligibility.issued) {
      return {
        message: 'Certificate already issued',
        certificateId: eligibility.certificateId,
      };
    }

    if (!eligibility.eligible) {
      throw new BadRequestException({
        message: 'Not eligible for certificate',
        criteria: eligibility.criteria,
      });
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: { name: true },
    });
    const prefix = (topic?.name || 'COURSE')
      .replace(/[^A-Z]/gi, '')
      .substring(0, 4)
      .toUpperCase();
    const certId = `ETS-${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Determine grade
    const avg = eligibility.criteria.averageQuizScore.score;
    let grade = 'C';
    if (avg >= 90) grade = 'A';
    else if (avg >= 80) grade = 'B';
    else if (avg >= 70) grade = 'B-';

    const cert = await this.prisma.courseCertificate.create({
      data: {
        userId,
        topicId,
        lessonsCompleted: eligibility.criteria.lessonsComplete.done,
        totalLessons: eligibility.criteria.lessonsComplete.total,
        projectsApproved: eligibility.criteria.projectsApproved.done,
        totalProjects: eligibility.criteria.projectsApproved.total,
        averageQuizScore: avg,
        overallGrade: grade,
        certificateId: certId,
      },
    });

    // Award XP for earning a certificate
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (profile) {
      await this.prisma.studentProfile.update({
        where: { userId },
        data: { xp: profile.xp + 100 },
      });
    }

    return cert;
  }

  async getMyCertificates(userId: string) {
    return this.prisma.courseCertificate.findMany({
      where: { userId },
      include: {
        topic: {
          select: {
            name: true,
            imageUrl: true,
            coverImage: true,
            parent: { select: { name: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getCertificateDetail(certificateId: string) {
    const cert = await this.prisma.courseCertificate.findUnique({
      where: { certificateId },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
        topic: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            parent: { select: { name: true } },
          },
        },
      },
    });

    if (!cert) throw new NotFoundException('Certificate not found');

    // Get lessons with hours
    const lessons = await this.prisma.lesson.findMany({
      where: { topicId: cert.topic.id, isPublished: true },
      select: { title: true, order: true, duration: true },
      orderBy: { order: 'asc' },
    });
    const totalMinutes = lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Get approved projects
    const approvedProjects = await this.prisma.submission.findMany({
      where: {
        studentId: cert.userId,
        status: 'APPROVED',
        assignment: { topicId: cert.topic.id },
      },
      include: {
        assignment: { select: { title: true, type: true, points: true } },
      },
    });

    return {
      certificateId: cert.certificateId,
      studentName: `${cert.user.firstName} ${cert.user.lastName}`,
      studentAvatar: cert.user.avatar,
      courseName: cert.topic.name,
      courseIcon: cert.topic.imageUrl,
      category: cert.topic.parent?.name || null,
      lessonsCompleted: cert.lessonsCompleted,
      totalLessons: cert.totalLessons,
      totalHoursCommitted: totalHours,
      projectsApproved: cert.projectsApproved,
      totalProjects: cert.totalProjects,
      averageQuizScore: cert.averageQuizScore,
      overallGrade: cert.overallGrade,
      issuedAt: cert.issuedAt,
      lessons: lessons.map((l) => ({
        title: l.title,
        order: l.order,
        duration: l.duration,
      })),
      projects: approvedProjects.map((s) => ({
        title: s.assignment.title,
        type: s.assignment.type,
        score: s.score,
        maxPoints: s.assignment.points,
      })),
      platform: 'ETS Platform',
      verifyUrl: `/verify/${cert.certificateId}`,
    };
  }

  async revokeCertificate(userId: string, topicId: string) {
    const cert = await this.prisma.courseCertificate.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    await this.prisma.courseCertificate.delete({
      where: { userId_topicId: { userId, topicId } },
    });

    return {
      message: 'Certificate revoked',
      certificateId: cert.certificateId,
    };
  }

  async getAllCertificates(filters: {
    topicId?: string;
    userId?: string;
    grade?: string;
    page?: number;
    limit?: number;
  }) {
    const { topicId, userId, grade, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (userId) where.userId = userId;
    if (grade) where.overallGrade = grade;

    const [certificates, total] = await Promise.all([
      this.prisma.courseCertificate.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          topic: {
            select: {
              name: true,
              parent: { select: { name: true } },
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.courseCertificate.count({ where }),
    ]);

    return {
      certificates,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
