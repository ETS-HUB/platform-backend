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
  console.log('🌱 Seeding demo data...\n');

  // ============== DEMO STUDENT ==============
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'demo@student.com' },
    update: {},
    create: {
      email: 'demo@student.com',
      password: studentPassword,
      firstName: 'Alex',
      lastName: 'Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      role: Role.STUDENT,
      profile: {
        create: {
          goal: 'Frontend Developer',
          experienceLevel: ExperienceLevel.BEGINNER,
          learningStyle: LearningStyle.VISUAL,
          weeklyHours: 15,
          xp: 340,
          level: 1,
          isVisibleToRecruiters: true,
        },
      },
    },
  });
  console.log(`✅ Demo student: demo@student.com / student123`);

  // Create some other students for enrollment display
  const otherStudents: any[] = [];
  const names = [
    { first: 'Sarah', last: 'Williams' },
    { first: 'Mike', last: 'Chen' },
    { first: 'Emily', last: 'Davis' },
    { first: 'James', last: 'Wilson' },
    { first: 'Olivia', last: 'Brown' },
    { first: 'Daniel', last: 'Taylor' },
    { first: 'Sophia', last: 'Martinez' },
    { first: 'Ethan', last: 'Anderson' },
  ];

  for (const name of names) {
    const pw = await bcrypt.hash('pass1234', 10);
    const u = await prisma.user.upsert({
      where: { email: `${name.first.toLowerCase()}@student.com` },
      update: {},
      create: {
        email: `${name.first.toLowerCase()}@student.com`,
        password: pw,
        firstName: name.first,
        lastName: name.last,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.first}`,
        role: Role.STUDENT,
        profile: {
          create: {
            goal: 'Frontend Developer',
            experienceLevel: ExperienceLevel.BEGINNER,
            learningStyle: LearningStyle.VISUAL,
            weeklyHours: 10,
            xp: Math.floor(Math.random() * 500),
            level: 1,
            isVisibleToRecruiters: true,
          },
        },
      },
    });
    otherStudents.push(u);
  }
  console.log(`✅ Created ${names.length} additional students`);

  // ============== CATEGORIES (Parent Topics) ==============
  const catProgramming = await prisma.topic.upsert({
    where: { name: 'Programming' },
    update: {
      imageUrl: null,
      description: 'Learn to code from scratch to advanced',
      coverImage:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    },
    create: {
      name: 'Programming',
      description: 'Learn to code from scratch to advanced',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    },
  });

  const catDesign = await prisma.topic.upsert({
    where: { name: 'Design' },
    update: {
      imageUrl: null,
      description: 'UI/UX design principles and tools',
      coverImage:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    },
    create: {
      name: 'Design',
      description: 'UI/UX design principles and tools',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    },
  });

  const catTools = await prisma.topic.upsert({
    where: { name: 'DevOps & Tools' },
    update: {
      imageUrl: null,
      description: 'Deployment, CI/CD, and developer tooling',
    },
    create: {
      name: 'DevOps & Tools',
      description: 'Deployment, CI/CD, and developer tooling',
      imageUrl: null,
    },
  });

  const catData = await prisma.topic.upsert({
    where: { name: 'Data & AI' },
    update: {
      imageUrl: null,
      description: 'Data science, analysis, and machine learning',
    },
    create: {
      name: 'Data & AI',
      description: 'Data science, analysis, and machine learning',
      imageUrl: null,
    },
  });
  console.log(`✅ Created 4 categories`);

  // ============== COURSES (Child Topics) ==============
  const courseJS = await prisma.topic.upsert({
    where: { name: 'JavaScript Fundamentals' },
    update: {
      parentId: catProgramming.id,
      track: 'frontend',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800',
    },
    create: {
      name: 'JavaScript Fundamentals',
      description: 'Master core JavaScript from variables to async programming',
      parentId: catProgramming.id,
      track: 'frontend',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800',
    },
  });

  const courseReact = await prisma.topic.upsert({
    where: { name: 'React Essentials' },
    update: {
      parentId: catProgramming.id,
      track: 'frontend',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    },
    create: {
      name: 'React Essentials',
      description: 'Build modern UIs with React — components, hooks, and state',
      parentId: catProgramming.id,
      track: 'frontend',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    },
  });

  const courseTS = await prisma.topic.upsert({
    where: { name: 'TypeScript for React' },
    update: { parentId: catProgramming.id, track: 'frontend' },
    create: {
      name: 'TypeScript for React',
      description: 'Add type safety to your React projects',
      parentId: catProgramming.id,
      track: 'frontend',
      imageUrl: null,
    },
  });

  const coursePython = await prisma.topic.upsert({
    where: { name: 'Python for Beginners' },
    update: { parentId: catProgramming.id, track: 'data-science' },
    create: {
      name: 'Python for Beginners',
      description: 'Start your programming journey with Python',
      parentId: catProgramming.id,
      track: 'data-science',
      imageUrl: null,
    },
  });

  const courseNode = await prisma.topic.upsert({
    where: { name: 'Node.js Backend Development' },
    update: { parentId: catProgramming.id, track: 'backend' },
    create: {
      name: 'Node.js Backend Development',
      description: 'Build APIs and servers with Node.js and Express',
      parentId: catProgramming.id,
      track: 'backend',
      imageUrl: null,
    },
  });

  const courseUX = await prisma.topic.upsert({
    where: { name: 'UX Fundamentals' },
    update: {
      parentId: catDesign.id,
      track: 'ui-ux',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800',
    },
    create: {
      name: 'UX Fundamentals',
      description:
        'Crafting better interfaces through user research and testing',
      parentId: catDesign.id,
      track: 'ui-ux',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800',
    },
  });

  const courseFigma = await prisma.topic.upsert({
    where: { name: 'Figma Essentials' },
    update: { parentId: catDesign.id, track: 'ui-ux' },
    create: {
      name: 'Figma Essentials',
      description: 'Design and prototype with Figma',
      parentId: catDesign.id,
      track: 'ui-ux',
      imageUrl: null,
    },
  });

  const courseGit = await prisma.topic.upsert({
    where: { name: 'Git & GitHub Workflow' },
    update: { parentId: catTools.id },
    create: {
      name: 'Git & GitHub Workflow',
      description: 'Version control for team collaboration',
      parentId: catTools.id,
      imageUrl: null,
    },
  });

  const courseDocker = await prisma.topic.upsert({
    where: { name: 'Docker for Developers' },
    update: { parentId: catTools.id, track: 'devops' },
    create: {
      name: 'Docker for Developers',
      description: 'Containerize your applications',
      parentId: catTools.id,
      track: 'devops',
      imageUrl: null,
    },
  });

  const courseDataAnalysis = await prisma.topic.upsert({
    where: { name: 'Data Analysis with Python' },
    update: { parentId: catData.id, track: 'data-science' },
    create: {
      name: 'Data Analysis with Python',
      description: 'Pandas, NumPy, and data visualization',
      parentId: catData.id,
      track: 'data-science',
      imageUrl: null,
    },
  });
  console.log(`✅ Created 10 courses`);

  // ============== LESSONS FOR JAVASCRIPT FUNDAMENTALS ==============
  const jsLessons = [
    {
      title: 'Variables & Data Types',
      description: 'Learn about var, let, const and JavaScript data types',
      order: 1,
      duration: 15,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Introduction',
          content:
            "## Variables in JavaScript\n\nA variable is a container for storing data. In modern JavaScript, we use `let` and `const`.\n\n### let vs const\n- `let` — can be reassigned\n- `const` — cannot be reassigned\n\n### Data Types\n- **String**: `'hello'`\n- **Number**: `42`, `3.14`\n- **Boolean**: `true`, `false`\n- **null** and **undefined**",
          overview: null,
        },
        {
          type: ContentBlockType.VIDEO,
          order: 1,
          title: 'Watch: JavaScript Variables Explained',
          content: 'https://www.youtube.com/watch?v=9aGMkNj5LNw',
          overview:
            'An 8-minute walkthrough of how variables work in JavaScript, covering let, const, and var with practical examples.',
          metadata: { duration: '8:24', provider: 'youtube' },
        },
        {
          type: ContentBlockType.CODE,
          order: 2,
          title: 'Example: Declaring Variables',
          content:
            "const name = 'John';\nconst age = 25;\nlet score = 0;\nscore = 10; // OK with let\n// name = 'Jane'; // ERROR with const",
          overview:
            'Try running this code to see the difference between let and const.',
          metadata: { language: 'javascript' },
        },
        {
          type: ContentBlockType.RESOURCE_LINK,
          order: 3,
          title: 'Further Reading: MDN Variables',
          content:
            'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/Variables',
          overview:
            'The official MDN documentation on JavaScript variables — comprehensive reference.',
        },
      ],
      questions: [
        {
          order: 0,
          difficulty: Difficulty.EASY,
          text: 'Which keyword declares a variable that cannot be reassigned?',
          options: [
            { id: 'a', text: 'var', isCorrect: false },
            { id: 'b', text: 'let', isCorrect: false },
            { id: 'c', text: 'const', isCorrect: true },
            { id: 'd', text: 'function', isCorrect: false },
          ],
          explanation: 'const declares a block-scoped constant.',
        },
        {
          order: 1,
          difficulty: Difficulty.EASY,
          text: 'What type is the value 42?',
          options: [
            { id: 'a', text: 'string', isCorrect: false },
            { id: 'b', text: 'number', isCorrect: true },
            { id: 'c', text: 'integer', isCorrect: false },
            { id: 'd', text: 'float', isCorrect: false },
          ],
          explanation: 'JavaScript has one number type for all numeric values.',
        },
      ],
    },
    {
      title: 'Arrays & Objects',
      description: 'Working with collections of data',
      order: 2,
      duration: 20,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Arrays',
          content:
            "## Arrays\n\nArrays store ordered lists of values.\n\n```javascript\nconst fruits = ['apple', 'banana', 'cherry'];\nconsole.log(fruits[0]); // 'apple'\nfruits.push('date');\n```\n\n## Objects\n\nObjects store key-value pairs.\n\n```javascript\nconst person = { name: 'John', age: 25 };\nconsole.log(person.name); // 'John'\n```",
        },
        {
          type: ContentBlockType.VIDEO,
          order: 1,
          title: 'Arrays & Objects Deep Dive',
          content: 'https://www.youtube.com/watch?v=R8rmfD9Y5-c',
          overview:
            'A comprehensive 15-minute tutorial covering array methods, object destructuring, and common patterns.',
          metadata: { duration: '15:10', provider: 'youtube' },
        },
        {
          type: ContentBlockType.CODE,
          order: 2,
          title: 'Practice: Array Methods',
          content:
            'const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconst evens = numbers.filter(n => n % 2 === 0);\nconst sum = numbers.reduce((acc, n) => acc + n, 0);',
          metadata: { language: 'javascript' },
        },
      ],
      questions: [
        {
          order: 0,
          difficulty: Difficulty.EASY,
          text: 'How do you access the first element of an array?',
          options: [
            { id: 'a', text: 'array[0]', isCorrect: true },
            { id: 'b', text: 'array[1]', isCorrect: false },
            { id: 'c', text: 'array.first()', isCorrect: false },
            { id: 'd', text: 'array.get(0)', isCorrect: false },
          ],
          explanation: 'Arrays are zero-indexed in JavaScript.',
        },
        {
          order: 1,
          difficulty: Difficulty.MEDIUM,
          text: 'Which method creates a new array with elements that pass a test?',
          options: [
            { id: 'a', text: '.map()', isCorrect: false },
            { id: 'b', text: '.filter()', isCorrect: true },
            { id: 'c', text: '.reduce()', isCorrect: false },
            { id: 'd', text: '.find()', isCorrect: false },
          ],
          explanation:
            '.filter() returns a new array with only elements where the callback returns true.',
        },
      ],
    },
    {
      title: 'Control Flow & Loops',
      description: 'if/else, switch, for, while loops',
      order: 3,
      duration: 18,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Conditionals',
          content:
            "## If/Else\n\n```javascript\nif (score >= 90) {\n  grade = 'A';\n} else if (score >= 80) {\n  grade = 'B';\n} else {\n  grade = 'C';\n}\n```\n\n## Loops\n\n```javascript\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n```",
        },
        {
          type: ContentBlockType.VIDEO,
          order: 1,
          title: 'Loops in JavaScript',
          content: 'https://www.youtube.com/watch?v=s9wW2PpJsmQ',
          overview:
            'Learn for loops, while loops, for...of, and when to use each.',
          metadata: { duration: '11:45', provider: 'youtube' },
        },
      ],
      questions: [
        {
          order: 0,
          difficulty: Difficulty.EASY,
          text: 'What does a for loop need?',
          options: [
            {
              id: 'a',
              text: 'initialization, condition, increment',
              isCorrect: true,
            },
            { id: 'b', text: 'start, stop, step', isCorrect: false },
            { id: 'c', text: 'begin, end, next', isCorrect: false },
            { id: 'd', text: 'first, last, count', isCorrect: false },
          ],
          explanation:
            'A for loop has three parts: initialization, condition, and increment.',
        },
      ],
    },
    {
      title: 'Functions & Scope',
      description:
        'Function declarations, expressions, arrow functions, and scope',
      order: 4,
      duration: 20,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Functions',
          content: '## Functions\n\nFunctions are reusable blocks of code.',
        },
        {
          type: ContentBlockType.VIDEO,
          order: 1,
          title: 'Functions Explained',
          content: 'https://www.youtube.com/watch?v=FOD408a0EzU',
          overview: 'Everything about JS functions in 14 minutes.',
          metadata: { duration: '14:32', provider: 'youtube' },
        },
      ],
      questions: [],
    },
    {
      title: 'DOM Manipulation',
      description: 'Selecting, creating, and modifying HTML elements',
      order: 5,
      duration: 22,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'The DOM',
          content:
            '## Document Object Model\n\nThe DOM lets you interact with HTML from JavaScript.',
        },
      ],
      questions: [],
    },
    {
      title: 'Async JavaScript',
      description: 'Callbacks, Promises, async/await',
      order: 6,
      duration: 25,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Async Basics',
          content:
            '## Asynchronous JavaScript\n\nJavaScript is single-threaded but can handle async operations.',
        },
      ],
      questions: [],
    },
    {
      title: 'Error Handling',
      description: 'try/catch, custom errors, debugging',
      order: 7,
      duration: 15,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Errors',
          content:
            '## Error Handling\n\nUse try/catch to handle errors gracefully.',
        },
      ],
      questions: [],
    },
    {
      title: 'ES6+ Features',
      description: 'Destructuring, spread, template literals, modules',
      order: 8,
      duration: 18,
      isPublished: true,
      blocks: [
        {
          type: ContentBlockType.TEXT,
          order: 0,
          title: 'Modern JS',
          content:
            '## ES6+ Features\n\nModern JavaScript syntax that makes code cleaner.',
        },
      ],
      questions: [],
    },
  ];

  for (const lesson of jsLessons) {
    const { blocks, questions, ...data } = lesson;
    await prisma.lesson.create({
      data: {
        ...data,
        topicId: courseJS.id,
        contentBlocks: {
          create: blocks.map((b) => ({
            ...b,
            metadata: b.metadata || undefined,
            overview: b.overview || undefined,
          })),
        },
        questions: {
          create: questions.map((q) => ({
            ...q,
            options: q.options as any,
            points: 10,
          })),
        },
      },
    });
  }
  console.log(`✅ Created 8 lessons for JavaScript Fundamentals`);

  // ============== LESSONS FOR REACT ==============
  const reactLessons = [
    { title: 'What is React?', order: 1, duration: 12, isPublished: true },
    { title: 'Components & JSX', order: 2, duration: 18, isPublished: true },
    { title: 'Props & State', order: 3, duration: 20, isPublished: true },
    { title: 'Event Handling', order: 4, duration: 15, isPublished: true },
    {
      title: 'useEffect & Lifecycle',
      order: 5,
      duration: 22,
      isPublished: true,
    },
    {
      title: 'Lists & Conditional Rendering',
      order: 6,
      duration: 16,
      isPublished: true,
    },
    {
      title: 'Forms & Controlled Components',
      order: 7,
      duration: 18,
      isPublished: true,
    },
    { title: 'React Router', order: 8, duration: 20, isPublished: true },
    { title: 'Context API', order: 9, duration: 17, isPublished: true },
    { title: 'Custom Hooks', order: 10, duration: 20, isPublished: true },
  ];
  for (const l of reactLessons) {
    await prisma.lesson.create({
      data: {
        ...l,
        topicId: courseReact.id,
        contentBlocks: {
          create: [
            {
              type: ContentBlockType.TEXT,
              order: 0,
              title: l.title,
              content: `## ${l.title}\n\nContent coming soon.`,
            },
          ],
        },
      },
    });
  }
  console.log(`✅ Created 10 lessons for React Essentials`);

  // Stub lessons for other courses
  const stubCourses = [
    { topic: courseUX, count: 6 },
    { topic: courseGit, count: 5 },
    { topic: courseFigma, count: 8 },
    { topic: courseTS, count: 7 },
    { topic: coursePython, count: 10 },
    { topic: courseNode, count: 8 },
    { topic: courseDocker, count: 6 },
    { topic: courseDataAnalysis, count: 7 },
  ];
  for (const { topic, count } of stubCourses) {
    for (let i = 1; i <= count; i++) {
      await prisma.lesson.create({
        data: {
          title: `Lesson ${i}`,
          order: i,
          duration: 10 + Math.floor(Math.random() * 15),
          isPublished: true,
          topicId: topic.id,
          contentBlocks: {
            create: [
              {
                type: ContentBlockType.TEXT,
                order: 0,
                title: `Lesson ${i}`,
                content: `## Lesson ${i}\n\nContent for ${topic.name}.`,
              },
            ],
          },
        },
      });
    }
  }
  console.log(`✅ Created stub lessons for 8 additional courses`);

  // ============== ENROLLMENTS ==============
  // Demo student enrolled in JS, React, and Git
  await prisma.topicEnrollment.createMany({
    data: [
      { userId: student.id, topicId: courseJS.id },
      { userId: student.id, topicId: courseReact.id },
      { userId: student.id, topicId: courseGit.id },
    ],
    skipDuplicates: true,
  });

  // Other students enrolled in various courses
  for (const s of otherStudents) {
    const courses = [courseJS, courseReact, courseUX, courseGit, coursePython]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    await prisma.topicEnrollment.createMany({
      data: courses.map((c) => ({ userId: s.id, topicId: c.id })),
      skipDuplicates: true,
    });
  }
  console.log(`✅ Created enrollments`);

  // ============== LESSON PROGRESS (Demo student completed 3 JS lessons) ==============
  const jsLessonsFromDB = await prisma.lesson.findMany({
    where: { topicId: courseJS.id },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: jsLessonsFromDB[i].id,
        completed: true,
        score: [90, 75, 85][i],
        completedAt: new Date(Date.now() - (3 - i) * 86400000), // 3, 2, 1 days ago
      },
    });
  }
  console.log(`✅ Created lesson progress (3 JS lessons completed)`);

  // ============== ASSESSMENT ATTEMPT ==============
  const config = await prisma.assessmentConfig.findFirst({
    where: { track: 'frontend', isBoothMode: false },
  });
  if (config) {
    await prisma.assessmentAttempt.create({
      data: {
        userId: student.id,
        configId: config.id,
        completedAt: new Date(Date.now() - 5 * 86400000),
        totalScore: 95,
        maxScore: 140,
        percentageScore: 68,
        topicScores: {
          [courseJS.id]: {
            topicName: 'JavaScript',
            correct: 3,
            total: 5,
            percentage: 60,
          },
          'html-id': {
            topicName: 'HTML',
            correct: 3,
            total: 3,
            percentage: 100,
          },
          'css-id': { topicName: 'CSS', correct: 2, total: 3, percentage: 67 },
          [courseReact.id]: {
            topicName: 'React',
            correct: 1,
            total: 3,
            percentage: 33,
          },
          'git-id': { topicName: 'Git', correct: 1, total: 1, percentage: 100 },
        },
        aiReport:
          "## Overall Assessment\n\nYou demonstrate solid HTML/CSS fundamentals with room to grow in JavaScript and React.\n\n## Strengths\n- **HTML (100%)**: Excellent understanding of semantic markup\n- **Git (100%)**: Strong version control knowledge\n- **CSS (67%)**: Good grasp of styling basics\n\n## Areas for Improvement\n- **React (33%)**: Focus on component patterns and hooks\n- **JavaScript (60%)**: Strengthen async patterns and closures\n\n## Recommendations\n1. Complete the JavaScript Fundamentals course (focus on lessons 4-6)\n2. Start React Essentials once JS is solid\n3. Practice daily coding challenges\n\n## Encouragement\nYour HTML/CSS foundation is strong — that's the hardest part for many beginners. JavaScript and React will click once you build on this base!",
      },
    });
  }
  console.log(`✅ Created assessment attempt`);

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
      ],
    });
  }
  console.log(`✅ Created badges`);

  // ============== PRACTICE SESSIONS ==============
  const jsTopicForPractice = await prisma.topic.findFirst({
    where: { name: 'JavaScript Fundamentals' },
  });
  const cssTopicForPractice = await prisma.topic.findFirst({
    where: { name: 'CSS' },
  });

  if (jsTopicForPractice) {
    await prisma.practiceSession.createMany({
      data: [
        {
          userId: student.id,
          topicId: jsTopicForPractice.id,
          totalQuestions: 10,
          correctAnswers: 8,
          completedAt: new Date(Date.now() - 1 * 86400000),
        },
        {
          userId: student.id,
          topicId: jsTopicForPractice.id,
          totalQuestions: 10,
          correctAnswers: 6,
          completedAt: new Date(Date.now() - 3 * 86400000),
        },
        {
          userId: student.id,
          topicId: jsTopicForPractice.id,
          totalQuestions: 10,
          correctAnswers: 5,
          completedAt: new Date(Date.now() - 5 * 86400000),
        },
      ],
    });
  }
  if (cssTopicForPractice) {
    await prisma.practiceSession.createMany({
      data: [
        {
          userId: student.id,
          topicId: cssTopicForPractice.id,
          totalQuestions: 5,
          correctAnswers: 4,
          completedAt: new Date(Date.now() - 2 * 86400000),
        },
      ],
    });
  }
  console.log(`✅ Created practice sessions`);

  console.log('\n🎉 Demo seed complete!');
  console.log('\n📋 Demo Student Credentials:');
  console.log('   Email:    demo@student.com');
  console.log('   Password: student123');
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
