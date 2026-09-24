import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  private async generate(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    return result.response.text();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateSkillReport(attemptId: string, userId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
    });

    if (!attempt || !attempt.topicScores) {
      throw new Error('Completed attempt not found');
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    const topicScores = attempt.topicScores as Record<
      string,
      { topicName: string; correct: number; total: number; percentage: number }
    >;

    const prompt = this.buildSkillReportPrompt(
      topicScores,
      attempt.percentageScore || 0,
      profile?.goal || 'Software Developer',
      profile?.experienceLevel || 'BEGINNER',
      profile?.learningStyle || 'VISUAL',
      profile?.weeklyHours || 10,
    );

    const report = await this.generate(
      'You are an expert technical career advisor and educator. Provide personalized, encouraging, and actionable skill assessments. Be specific about strengths and areas for improvement. Keep the tone professional but warm.',
      prompt,
    );

    // Store the report
    await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { aiReport: report },
    });

    // Also store on profile for quick access
    if (profile) {
      await this.prisma.studentProfile.update({
        where: { userId },
        data: { aiSkillReport: report },
      });
    }

    return { report };
  }

  async generateLearningPath(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!profile)
      throw new Error('Profile not found. Complete onboarding first.');

    const latestAttempt = profile.user.assessmentAttempts[0];
    if (!latestAttempt) throw new Error('No completed assessment found');

    const topicScores = latestAttempt.topicScores as Record<string, any>;

    const prompt = `Based on the following assessment results, generate a personalized learning path.

Student Profile:
- Goal: ${profile.goal}
- Experience Level: ${profile.experienceLevel}
- Learning Style: ${profile.learningStyle}
- Weekly Availability: ${profile.weeklyHours} hours/week

Assessment Results (by topic):
${Object.entries(topicScores)
  .map(
    ([_, data]) =>
      `- ${data.topicName}: ${Math.round(data.percentage)}% (${data.correct}/${data.total} correct)`,
  )
  .join('\n')}

Overall Score: ${Math.round(latestAttempt.percentageScore || 0)}%

Generate a structured learning path as a JSON array with this format:
[
  {
    "week": 1,
    "topic": "Topic Name",
    "focus": "Specific focus area",
    "estimatedHours": 5,
    "priority": "high|medium|low",
    "reason": "Why this is prioritized here"
  }
]

Prioritize weak areas first, build on strengths, and respect the student's weekly availability of ${profile.weeklyHours} hours. Target 8-12 weeks total. Return ONLY the JSON array, no other text.`;

    const content = await this.generate(
      'You are a curriculum designer. Return ONLY valid JSON arrays. No markdown code fences, no explanation outside the JSON.',
      prompt,
    );

    let learningPath;
    try {
      learningPath = JSON.parse(content.trim());
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      learningPath = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    await this.prisma.studentProfile.update({
      where: { userId },
      data: { aiLearningPath: learningPath },
    });

    return { learningPath };
  }

  async generateCheatSheet(userId: string, topicName?: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!profile)
      throw new Error('Profile not found. Complete onboarding first.');

    const latestAttempt = profile.user.assessmentAttempts[0];
    const topicScores = latestAttempt?.topicScores as Record<string, any>;

    let weakestTopic = topicName;
    if (!weakestTopic && topicScores) {
      const sorted = Object.entries(topicScores).sort(
        ([, a]: any, [, b]: any) => a.percentage - b.percentage,
      );
      weakestTopic = sorted[0]?.[1]?.topicName || 'JavaScript';
    }
    if (!weakestTopic) weakestTopic = 'JavaScript';

    const prompt = `Generate a concise, beginner-friendly cheat sheet for: ${weakestTopic}

The student's learning style is: ${profile.learningStyle}
Experience level: ${profile.experienceLevel}

Create a cheat sheet that includes:
1. Key concepts (5-7 bullet points)
2. Common syntax/patterns (with short code examples if applicable)
3. Common mistakes to avoid (3-4 points)
4. Quick tips (3-4 actionable tips)

Format it in clean Markdown. Keep it to one page equivalent (~500 words max). Make it practical and immediately useful.`;

    const cheatSheet = await this.generate(
      'You are a technical educator creating concise, practical cheat sheets. Use clear formatting and real-world examples.',
      prompt,
    );

    await this.prisma.studentProfile.update({
      where: { userId },
      data: { aiCheatSheet: cheatSheet },
    });

    return { topic: weakestTopic, cheatSheet };
  }

  async generateResourceRecommendations(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            assessmentAttempts: {
              where: { completedAt: { not: null } },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!profile)
      throw new Error('Profile not found. Complete onboarding first.');

    const latestAttempt = profile.user.assessmentAttempts[0];
    const topicScores = latestAttempt?.topicScores as Record<string, any>;

    if (!topicScores) throw new Error('No assessment scores found');

    const weakTopics = Object.entries(topicScores)
      .filter(([, data]: any) => data.percentage < 60)
      .map(([topicId, data]: any) => ({ topicId, ...data }));

    const resources = await this.prisma.resource.findMany({
      where: {
        isActive: true,
        topic: {
          name: { in: weakTopics.map((t) => t.topicName) },
        },
        OR: [{ learningStyle: profile.learningStyle }, { learningStyle: null }],
      },
      include: { topic: { select: { name: true } } },
      take: 15,
    });

    const recommendations = resources.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      type: r.type,
      topic: r.topic.name,
      difficulty: r.difficulty,
    }));

    await this.prisma.studentProfile.update({
      where: { userId },
      data: { aiRecommendations: recommendations },
    });

    return { recommendations, weakTopics: weakTopics.map((t) => t.topicName) };
  }

  // Generate all AI content after assessment completion (sequential with delays)
  async generateAllPostAssessment(attemptId: string, userId: string) {
    const results: any = {};

    // Check profile exists first
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        skillReport: {
          error:
            'Profile not found. Complete onboarding first (POST /api/users/profile).',
        },
        learningPath: {
          error: 'Profile not found. Complete onboarding first.',
        },
        cheatSheet: { error: 'Profile not found. Complete onboarding first.' },
        recommendations: {
          error: 'Profile not found. Complete onboarding first.',
        },
      };
    }

    // 1. Skill Report
    try {
      results.skillReport = await this.generateSkillReport(attemptId, userId);
    } catch (e: any) {
      this.logger.error('Skill report generation failed', e?.message);
      results.skillReport = {
        error: 'Failed to generate',
        detail: e?.message || String(e),
      };
    }

    // Wait between AI calls to avoid rate limits
    await this.delay(4000);

    // 2. Learning Path
    try {
      results.learningPath = await this.generateLearningPath(userId);
    } catch (e: any) {
      this.logger.error('Learning path generation failed', e?.message);
      results.learningPath = {
        error: 'Failed to generate',
        detail: e?.message || String(e),
      };
    }

    await this.delay(4000);

    // 3. Cheat Sheet
    try {
      results.cheatSheet = await this.generateCheatSheet(userId);
    } catch (e: any) {
      this.logger.error('Cheat sheet generation failed', e?.message);
      results.cheatSheet = {
        error: 'Failed to generate',
        detail: e?.message || String(e),
      };
    }

    // 4. Recommendations (no AI call — just DB query, no delay needed)
    try {
      results.recommendations =
        await this.generateResourceRecommendations(userId);
    } catch (e: any) {
      this.logger.error('Recommendations generation failed', e?.message);
      results.recommendations = {
        error: 'Failed to generate',
        detail: e?.message || String(e),
      };
    }

    return results;
  }

  // ============== PRIVATE HELPERS ==============

  private buildSkillReportPrompt(
    topicScores: Record<string, any>,
    overallScore: number,
    goal: string,
    experienceLevel: string,
    learningStyle: string,
    weeklyHours: number,
  ): string {
    return `Analyze the following skill assessment results and provide a personalized report.

Student Profile:
- Career Goal: ${goal}
- Experience Level: ${experienceLevel}
- Preferred Learning Style: ${learningStyle}
- Weekly Availability: ${weeklyHours} hours

Assessment Results:
- Overall Score: ${Math.round(overallScore)}%
- Topic Breakdown:
${Object.entries(topicScores)
  .map(
    ([_, data]) =>
      `  • ${data.topicName}: ${Math.round(data.percentage)}% (${data.correct}/${data.total} correct)`,
  )
  .join('\n')}

Please provide:
1. **Overall Assessment** (2-3 sentences summarizing their current level)
2. **Strengths** (top 2-3 areas they excel in, with specific observations)
3. **Areas for Improvement** (top 2-3 weak areas, with actionable advice)
4. **Personalized Recommendations** (3-4 specific next steps based on their goal, learning style, and available time)
5. **Encouragement** (1-2 sentences of genuine, specific encouragement)

Keep the tone professional but supportive. Be specific — reference actual scores and topics.`;
  }
}
