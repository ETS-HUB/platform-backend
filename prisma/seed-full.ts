import 'dotenv/config';
import {
  PrismaClient,
  Role,
  Difficulty,
  ResourceType,
  LearningStyle,
  ContentBlockType,
  ExperienceLevel,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Full seed with all features...\n');

  // ============== USERS ==============
  const adminPw = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ets.com',
      password: adminPw,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });

  const recruiterPw = await bcrypt.hash('recruiter123', 10);
  const recruiter = await prisma.user.create({
    data: {
      email: 'recruiter@company.com',
      password: recruiterPw,
      firstName: 'Jane',
      lastName: 'Recruiter',
      role: Role.RECRUITER,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    },
  });

  const tutorPw = await bcrypt.hash('tutor123', 10);
  const tutor1 = await prisma.user.create({
    data: {
      email: 'sarah.tutor@ets.com',
      password: tutorPw,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: Role.TUTOR,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahT',
    },
  });
  const tutor2 = await prisma.user.create({
    data: {
      email: 'david.tutor@ets.com',
      password: tutorPw,
      firstName: 'David',
      lastName: 'Park',
      role: Role.TUTOR,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidT',
    },
  });

  const studentPw = await bcrypt.hash('student123', 10);
  const student = await prisma.user.create({
    data: {
      email: 'demo@student.com',
      password: studentPw,
      firstName: 'Alex',
      lastName: 'Johnson',
      role: Role.STUDENT,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      profile: {
        create: {
          goal: 'Frontend Developer',
          experienceLevel: ExperienceLevel.BEGINNER,
          learningStyle: LearningStyle.VISUAL,
          weeklyHours: 15,
          xp: 420,
          level: 1,
          isVisibleToRecruiters: true,
        },
      },
    },
  });

  // Other students
  const studentNames = [
    { f: 'Emily', l: 'Davis' },
    { f: 'Mike', l: 'Chen' },
    { f: 'Sophia', l: 'Martinez' },
    { f: 'James', l: 'Wilson' },
    { f: 'Olivia', l: 'Brown' },
    { f: 'Ethan', l: 'Anderson' },
    { f: 'Daniel', l: 'Taylor' },
    { f: 'Mia', l: 'Thomas' },
  ];
  const otherStudents: any[] = [];
  for (const n of studentNames) {
    const u = await prisma.user.create({
      data: {
        email: `${n.f.toLowerCase()}@student.com`,
        password: studentPw,
        firstName: n.f,
        lastName: n.l,
        role: Role.STUDENT,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.f}`,
        profile: {
          create: {
            goal: ['Frontend Developer', 'Backend Developer', 'UI/UX Designer'][
              Math.floor(Math.random() * 3)
            ],
            experienceLevel: ExperienceLevel.BEGINNER,
            learningStyle: LearningStyle.VISUAL,
            weeklyHours: 10,
            xp: Math.floor(Math.random() * 300),
            level: 1,
            isVisibleToRecruiters: true,
          },
        },
      },
    });
    otherStudents.push(u);
  }
  console.log('✅ Users: admin, recruiter, 2 tutors, demo student, 8 others');

  // ============== CATEGORIES ==============
  const catProg = await prisma.topic.create({
    data: {
      name: 'Programming',
      description: 'Learn to code from scratch to advanced',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    },
  });
  const catDesign = await prisma.topic.create({
    data: {
      name: 'Design',
      description: 'UI/UX design principles and tools',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    },
  });
  const catTools = await prisma.topic.create({
    data: {
      name: 'DevOps & Tools',
      description: 'Deployment, CI/CD, and developer tooling',
      imageUrl: null,
    },
  });
  const catData = await prisma.topic.create({
    data: {
      name: 'Data & AI',
      description: 'Data science, analysis, and machine learning',
      imageUrl: null,
    },
  });
  console.log('✅ 4 categories');

  // ============== COURSES ==============
  const courseJS = await prisma.topic.create({
    data: {
      name: 'JavaScript Fundamentals',
      description: 'Master core JavaScript from variables to async programming',
      parentId: catProg.id,
      track: 'frontend',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800',
      isSequential: true,
    },
  });
  const courseReact = await prisma.topic.create({
    data: {
      name: 'React Essentials',
      description: 'Build modern UIs with React — components, hooks, and state',
      parentId: catProg.id,
      track: 'frontend',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
      isSequential: true,
    },
  });
  const courseTS = await prisma.topic.create({
    data: {
      name: 'TypeScript for React',
      description: 'Add type safety to your React projects',
      parentId: catProg.id,
      track: 'frontend',
      imageUrl: null,
      isSequential: true,
    },
  });
  const coursePython = await prisma.topic.create({
    data: {
      name: 'Python for Beginners',
      description: 'Start your programming journey with Python',
      parentId: catProg.id,
      track: 'data-science',
      imageUrl: null,
      isSequential: true,
    },
  });
  const courseNode = await prisma.topic.create({
    data: {
      name: 'Node.js Backend Development',
      description: 'Build APIs and servers with Node.js and Express',
      parentId: catProg.id,
      track: 'backend',
      imageUrl: null,
      isSequential: true,
    },
  });
  const courseUX = await prisma.topic.create({
    data: {
      name: 'UX Fundamentals',
      description:
        'Crafting better interfaces through user research and testing',
      parentId: catDesign.id,
      track: 'ui-ux',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800',
      isSequential: false,
    },
  });
  const courseFigma = await prisma.topic.create({
    data: {
      name: 'Figma Essentials',
      description: 'Design and prototype with Figma',
      parentId: catDesign.id,
      track: 'ui-ux',
      imageUrl: null,
      isSequential: false,
    },
  });
  const courseGit = await prisma.topic.create({
    data: {
      name: 'Git & GitHub Workflow',
      description: 'Version control for team collaboration',
      parentId: catTools.id,
      imageUrl: null,
      isSequential: false,
    },
  });
  const courseDocker = await prisma.topic.create({
    data: {
      name: 'Docker for Developers',
      description: 'Containerize your applications',
      parentId: catTools.id,
      track: 'devops',
      imageUrl: null,
      isSequential: true,
    },
  });
  const courseDataAnalysis = await prisma.topic.create({
    data: {
      name: 'Data Analysis with Python',
      description: 'Pandas, NumPy, and data visualization',
      parentId: catData.id,
      track: 'data-science',
      imageUrl: null,
      isSequential: true,
    },
  });
  console.log('✅ 10 courses');

  // ============== TUTOR ASSIGNMENTS ==============
  await prisma.courseTutor.createMany({
    data: [
      { userId: tutor1.id, topicId: courseJS.id },
      { userId: tutor1.id, topicId: courseReact.id },
      { userId: tutor2.id, topicId: coursePython.id },
      { userId: tutor2.id, topicId: courseNode.id },
      { userId: tutor1.id, topicId: courseUX.id },
    ],
  });
  console.log('✅ Tutors assigned to courses');

  // ============== LESSONS: JavaScript Fundamentals (8 lessons) ==============
  const jsLessonData = [
    {
      title: 'Variables & Data Types',
      desc: 'Learn var, let, const and JS data types',
      dur: 15,
    },
    {
      title: 'Arrays & Objects',
      desc: 'Working with collections of data',
      dur: 20,
    },
    {
      title: 'Control Flow & Loops',
      desc: 'if/else, switch, for, while loops',
      dur: 18,
    },
    {
      title: 'Functions & Scope',
      desc: 'Declarations, expressions, arrow functions, closures',
      dur: 20,
    },
    {
      title: 'DOM Manipulation',
      desc: 'Selecting, creating, and modifying HTML elements',
      dur: 22,
    },
    {
      title: 'Async JavaScript',
      desc: 'Callbacks, Promises, async/await',
      dur: 25,
    },
    {
      title: 'Error Handling',
      desc: 'try/catch, custom errors, debugging',
      dur: 15,
    },
    {
      title: 'ES6+ Features',
      desc: 'Destructuring, spread, template literals, modules',
      dur: 18,
    },
  ];
  const jsLessons: any[] = [];
  for (let i = 0; i < jsLessonData.length; i++) {
    const l = await prisma.lesson.create({
      data: {
        topicId: courseJS.id,
        title: jsLessonData[i].title,
        description: jsLessonData[i].desc,
        order: i + 1,
        duration: jsLessonData[i].dur,
        isPublished: true,
        contentBlocks: {
          create: [
            {
              type: ContentBlockType.TEXT,
              order: 0,
              title: 'Introduction',
              content: `## ${jsLessonData[i].title}\n\nThis lesson covers ${jsLessonData[i].desc.toLowerCase()}.`,
            },
            {
              type: ContentBlockType.VIDEO,
              order: 1,
              title: `Watch: ${jsLessonData[i].title}`,
              content: `https://www.youtube.com/watch?v=js-lesson-${i + 1}`,
              overview: `A comprehensive video covering ${jsLessonData[i].desc.toLowerCase()} with practical examples.`,
              metadata: {
                duration: `${10 + i * 2}:${30 + i}0`,
                provider: 'youtube',
              },
            },
            {
              type: ContentBlockType.CODE,
              order: 2,
              title: 'Try It Yourself',
              content: `// Example code for ${jsLessonData[i].title}\nconsole.log("Hello from lesson ${i + 1}!");`,
              overview: 'Run this code and experiment with modifications.',
              metadata: { language: 'javascript' },
            },
          ],
        },
        questions: {
          create: [
            {
              order: 0,
              difficulty: Difficulty.EASY,
              text: `Question 1 about ${jsLessonData[i].title}?`,
              options: [
                { id: 'a', text: 'Option A', isCorrect: false },
                { id: 'b', text: 'Option B', isCorrect: true },
                { id: 'c', text: 'Option C', isCorrect: false },
                { id: 'd', text: 'Option D', isCorrect: false },
              ] as any,
              explanation: `The correct answer demonstrates understanding of ${jsLessonData[i].title.toLowerCase()}.`,
              points: 10,
            },
            {
              order: 1,
              difficulty: Difficulty.MEDIUM,
              text: `Question 2 about ${jsLessonData[i].title}?`,
              options: [
                { id: 'a', text: 'Choice 1', isCorrect: false },
                { id: 'b', text: 'Choice 2', isCorrect: false },
                { id: 'c', text: 'Choice 3', isCorrect: true },
                { id: 'd', text: 'Choice 4', isCorrect: false },
              ] as any,
              explanation: `This tests deeper understanding of ${jsLessonData[i].title.toLowerCase()}.`,
              points: 10,
            },
          ],
        },
      },
    });
    jsLessons.push(l);
  }
  console.log('✅ 8 JS lessons with content blocks + questions');

  // React lessons (10)
  const reactTitles = [
    'What is React?',
    'Components & JSX',
    'Props & State',
    'Event Handling',
    'useEffect & Lifecycle',
    'Lists & Conditional Rendering',
    'Forms & Controlled Components',
    'React Router',
    'Context API',
    'Custom Hooks',
  ];
  for (let i = 0; i < reactTitles.length; i++) {
    await prisma.lesson.create({
      data: {
        topicId: courseReact.id,
        title: reactTitles[i],
        order: i + 1,
        duration: 12 + i * 2,
        isPublished: true,
        contentBlocks: {
          create: [
            {
              type: ContentBlockType.TEXT,
              order: 0,
              title: reactTitles[i],
              content: `## ${reactTitles[i]}\n\nLearn about ${reactTitles[i].toLowerCase()} in React.`,
            },
            {
              type: ContentBlockType.VIDEO,
              order: 1,
              title: `Video: ${reactTitles[i]}`,
              content: `https://www.youtube.com/watch?v=react-${i + 1}`,
              overview: `${reactTitles[i]} explained with live coding examples.`,
              metadata: { duration: `${8 + i}:00`, provider: 'youtube' },
            },
          ],
        },
        questions: {
          create: [
            {
              order: 0,
              difficulty: Difficulty.EASY,
              text: `What is the purpose of ${reactTitles[i]}?`,
              options: [
                { id: 'a', text: 'Correct answer', isCorrect: true },
                { id: 'b', text: 'Wrong', isCorrect: false },
                { id: 'c', text: 'Wrong', isCorrect: false },
                { id: 'd', text: 'Wrong', isCorrect: false },
              ] as any,
              explanation: `${reactTitles[i]} is a core React concept.`,
              points: 10,
            },
          ],
        },
      },
    });
  }
  console.log('✅ 10 React lessons');

  // Other courses: 5-8 lessons each
  const otherCourses = [
    {
      topic: courseTS,
      titles: [
        'TypeScript Basics',
        'Types & Interfaces',
        'Generics',
        'TypeScript with React',
        'Advanced Patterns',
        'Config & Tooling',
        'Migration Guide',
      ],
    },
    {
      topic: coursePython,
      titles: [
        'Python Setup',
        'Variables & Types',
        'Control Flow',
        'Functions',
        'Lists & Dicts',
        'File I/O',
        'Modules',
        'OOP Basics',
        'Error Handling',
        'Final Project',
      ],
    },
    {
      topic: courseNode,
      titles: [
        'Node.js Intro',
        'Modules & NPM',
        'HTTP Server',
        'Express Basics',
        'Middleware',
        'REST APIs',
        'Database Integration',
        'Authentication',
      ],
    },
    {
      topic: courseUX,
      titles: [
        'What is UX?',
        'User Research',
        'Personas & Journey Maps',
        'Wireframing',
        'Prototyping',
        'Usability Testing',
      ],
    },
    {
      topic: courseFigma,
      titles: [
        'Figma Interface',
        'Frames & Layouts',
        'Components',
        'Auto Layout',
        'Prototyping',
        'Design Systems',
        'Collaboration',
        'Handoff',
      ],
    },
    {
      topic: courseGit,
      titles: [
        'Git Basics',
        'Branching',
        'Merging & Conflicts',
        'GitHub Flow',
        'Pull Requests',
      ],
    },
    {
      topic: courseDocker,
      titles: [
        'What is Docker?',
        'Containers vs VMs',
        'Dockerfile',
        'Docker Compose',
        'Networking',
        'Volumes',
      ],
    },
    {
      topic: courseDataAnalysis,
      titles: [
        'Intro to Data Analysis',
        'Pandas Basics',
        'Data Cleaning',
        'Visualization',
        'Statistical Analysis',
        'NumPy',
        'Final Project',
      ],
    },
  ];
  for (const c of otherCourses) {
    for (let i = 0; i < c.titles.length; i++) {
      await prisma.lesson.create({
        data: {
          topicId: c.topic.id,
          title: c.titles[i],
          order: i + 1,
          duration: 10 + Math.floor(Math.random() * 15),
          isPublished: true,
          contentBlocks: {
            create: [
              {
                type: ContentBlockType.TEXT,
                order: 0,
                title: c.titles[i],
                content: `## ${c.titles[i]}\n\nContent for ${c.topic.name}.`,
              },
            ],
          },
        },
      });
    }
  }
  console.log('✅ Lessons for 8 other courses');

  // ============== ENROLLMENTS ==============
  // Demo student enrolled in JS (in progress), React (not started), Git (not started)
  await prisma.topicEnrollment.createMany({
    data: [
      { userId: student.id, topicId: courseJS.id },
      { userId: student.id, topicId: courseReact.id },
      { userId: student.id, topicId: courseGit.id },
    ],
  });
  // Other students in various courses
  for (const s of otherStudents) {
    const picks = [
      courseJS,
      courseReact,
      courseUX,
      courseGit,
      coursePython,
      courseNode,
    ]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 + Math.floor(Math.random() * 2));
    await prisma.topicEnrollment.createMany({
      data: picks.map((c) => ({ userId: s.id, topicId: c.id })),
      skipDuplicates: true,
    });
  }
  console.log('✅ Enrollments');

  // ============== LESSON PROGRESS (demo student completed 3 JS lessons) ==============
  for (let i = 0; i < 3; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: jsLessons[i].id,
        completed: true,
        score: [90, 75, 85][i],
        completedAt: new Date(Date.now() - (3 - i) * 86400000),
      },
    });
  }
  console.log('✅ Lesson progress (3 JS completed)');

  // ============== BOOKMARKS ==============
  await prisma.courseBookmark.createMany({
    data: [
      { userId: student.id, topicId: courseReact.id },
      { userId: student.id, topicId: courseUX.id },
      { userId: student.id, topicId: courseDocker.id },
    ],
  });
  console.log('✅ Bookmarks (3 courses)');

  // ============== PRACTICE SESSIONS ==============
  await prisma.practiceSession.createMany({
    data: [
      {
        userId: student.id,
        topicId: courseJS.id,
        totalQuestions: 10,
        correctAnswers: 8,
        completedAt: new Date(Date.now() - 1 * 86400000),
      },
      {
        userId: student.id,
        topicId: courseJS.id,
        totalQuestions: 10,
        correctAnswers: 6,
        completedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        userId: student.id,
        topicId: courseJS.id,
        totalQuestions: 10,
        correctAnswers: 5,
        completedAt: new Date(Date.now() - 5 * 86400000),
      },
    ],
  });
  console.log('✅ Practice sessions');

  // ============== ASSESSMENT CONFIG + ATTEMPT ==============
  const config = await prisma.assessmentConfig.create({
    data: {
      name: 'Frontend Developer Assessment',
      description: 'Assessment for frontend track',
      track: 'frontend',
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
      difficultyDistribution: { EASY: 5, MEDIUM: 7, HARD: 3 },
    },
  });
  await prisma.assessmentConfig.create({
    data: {
      name: 'Frontend - Booth',
      track: 'frontend',
      totalQuestions: 10,
      timeLimitMinutes: 12,
      isBoothMode: true,
    },
  });
  await prisma.assessmentConfig.create({
    data: {
      name: 'Backend Developer Assessment',
      track: 'backend',
      totalQuestions: 15,
      timeLimitMinutes: 25,
    },
  });
  await prisma.assessmentConfig.create({
    data: {
      name: 'General Tech Assessment',
      totalQuestions: 15,
      timeLimitMinutes: 25,
    },
  });

  await prisma.assessmentAttempt.create({
    data: {
      userId: student.id,
      configId: config.id,
      completedAt: new Date(Date.now() - 5 * 86400000),
      totalScore: 95,
      maxScore: 140,
      percentageScore: 68,
      topicScores: {
        js: { topicName: 'JavaScript', correct: 3, total: 5, percentage: 60 },
        html: { topicName: 'HTML', correct: 3, total: 3, percentage: 100 },
        css: { topicName: 'CSS', correct: 2, total: 3, percentage: 67 },
        react: { topicName: 'React', correct: 1, total: 3, percentage: 33 },
        git: { topicName: 'Git', correct: 1, total: 1, percentage: 100 },
      },
      aiReport:
        '## Overall Assessment\n\nYou demonstrate solid HTML/CSS fundamentals with room to grow in JavaScript and React.\n\n## Strengths\n- **HTML (100%)**: Excellent semantic markup\n- **Git (100%)**: Strong version control\n- **CSS (67%)**: Good styling basics\n\n## Areas for Improvement\n- **React (33%)**: Focus on hooks and component patterns\n- **JavaScript (60%)**: Strengthen closures and async\n\n## Recommendations\n1. Complete JavaScript Fundamentals lessons 4-6\n2. Start React Essentials once JS is solid\n3. Practice daily coding challenges',
    },
  });
  console.log('✅ Assessment configs + attempt');

  // ============== BADGES ==============
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });
  if (profile) {
    await prisma.badge.createMany({
      data: [
        {
          name: 'First Assessment',
          description: 'Completed your first skill assessment',
          imageUrl: null,
          profileId: profile.id,
        },
        {
          name: 'HTML Expert',
          description: 'Scored above 75% in HTML',
          imageUrl: null,
          profileId: profile.id,
        },
        {
          name: 'Quick Learner',
          description: 'Scored above 70% on assessment',
          imageUrl: null,
          profileId: profile.id,
        },
        {
          name: '30-Day Streak',
          description: 'Logged in 30 days in a row',
          imageUrl: null,
          profileId: profile.id,
        },
      ],
    });
  }
  console.log('✅ Badges');

  // ============== RESOURCES ==============
  await prisma.resource.createMany({
    data: [
      {
        topicId: courseJS.id,
        title: 'MDN JavaScript Guide',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
        type: ResourceType.DOCUMENTATION,
        difficulty: Difficulty.EASY,
        description: 'Official MDN JS guide',
      },
      {
        topicId: courseJS.id,
        title: 'JavaScript.info',
        url: 'https://javascript.info/',
        type: ResourceType.TUTORIAL,
        difficulty: Difficulty.EASY,
        description: 'Modern JS tutorial',
      },
      {
        topicId: courseJS.id,
        title: 'Traversy Media JS Crash Course',
        url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
        type: ResourceType.VIDEO,
        difficulty: Difficulty.EASY,
        learningStyle: LearningStyle.VISUAL,
        description: 'Video crash course',
      },
      {
        topicId: courseReact.id,
        title: 'React Official Docs',
        url: 'https://react.dev/learn',
        type: ResourceType.DOCUMENTATION,
        difficulty: Difficulty.MEDIUM,
        description: 'Official React docs',
      },
      {
        topicId: courseReact.id,
        title: 'React Tutorial for Beginners',
        url: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
        type: ResourceType.VIDEO,
        difficulty: Difficulty.EASY,
        learningStyle: LearningStyle.VISUAL,
      },
      {
        topicId: coursePython.id,
        title: 'Python Official Tutorial',
        url: 'https://docs.python.org/3/tutorial/',
        type: ResourceType.DOCUMENTATION,
        difficulty: Difficulty.EASY,
      },
    ],
  });
  console.log('✅ Resources');

  console.log('\n🎉 Full seed complete!\n');
  console.log('📋 Credentials:');
  console.log('   Admin:     admin@ets.com / admin123');
  console.log('   Recruiter: recruiter@company.com / recruiter123');
  console.log('   Tutor 1:   sarah.tutor@ets.com / tutor123');
  console.log('   Tutor 2:   david.tutor@ets.com / tutor123');
  console.log('   Student:   demo@student.com / student123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
