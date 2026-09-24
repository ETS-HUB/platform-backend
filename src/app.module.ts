import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssessmentModule } from './assessment/assessment.module';
import { AiModule } from './ai/ai.module';
import { PracticeModule } from './practice/practice.module';
import { ResourcesModule } from './resources/resources.module';
import { GamificationModule } from './gamification/gamification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { RecruiterModule } from './recruiter/recruiter.module';
import { LessonsModule } from './lessons/lessons.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChatModule } from './chat/chat.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { UploadModule } from './upload/upload.module';
import { CertificatesModule } from './certificates/certificates.module';
import { TracksModule } from './tracks/tracks.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TutorModule } from './tutor/tutor.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    AssessmentModule,
    AiModule,
    PracticeModule,
    ResourcesModule,
    GamificationModule,
    AnalyticsModule,
    AdminModule,
    RecruiterModule,
    LessonsModule,
    DashboardModule,
    ChatModule,
    AssignmentsModule,
    UploadModule,
    CertificatesModule,
    TracksModule,
    LeaderboardModule,
    TutorModule,
  ],
})
export class AppModule {}
