import 'dotenv/config';
import {
  PrismaClient,
  Difficulty,
  ResourceType,
  LearningStyle,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('🌱 Seeding student demo data...\n');

  const student = await prisma.user.findFirst({
    where: { email: 'demo@student.com' },
  });
  const tutor = await prisma.user.findFirst({ where: { role: 'TUTOR' } });
  if (!student || !tutor) {
    console.log('Student or tutor not found');
    return;
  }

  // Get courses
  const courseJS = await prisma.topic.findFirst({
    where: { name: 'JavaScript Fundamentals' },
  });
  if (!courseJS) {
    console.log('JS course not found');
    return;
  }

  // Update student's trackSlug
  await prisma.studentProfile.update({
    where: { userId: student.id },
    data: { trackSlug: 'frontend' },
  });
  console.log('✅ Student trackSlug set to frontend');

  // ============== PRACTICE QUESTIONS (for assessment topics) ==============
  // Get flat topics used in assessments
  const htmlTopic = await prisma.topic.findFirst({ where: { name: 'HTML' } });
  const cssTopic = await prisma.topic.findFirst({ where: { name: 'CSS' } });
  const jsTopic = await prisma.topic.findFirst({
    where: { name: 'JavaScript' },
  });
  const reactTopic = await prisma.topic.findFirst({ where: { name: 'React' } });
  const gitTopic = await prisma.topic.findFirst({ where: { name: 'Git' } });

  // Add more practice questions per topic
  const practiceQs: any[] = [];

  if (jsTopic) {
    practiceQs.push(
      ...[
        {
          topicId: jsTopic.id,
          difficulty: Difficulty.EASY,
          text: 'What does the === operator do?',
          options: [
            { id: 'a', text: 'Assigns a value', isCorrect: false },
            {
              id: 'b',
              text: 'Checks value and type equality',
              isCorrect: true,
            },
            { id: 'c', text: 'Checks only value', isCorrect: false },
            { id: 'd', text: 'Compares strings', isCorrect: false },
          ],
          explanation:
            '=== checks both value AND type, unlike == which only checks value.',
          points: 10,
        },
        {
          topicId: jsTopic.id,
          difficulty: Difficulty.MEDIUM,
          text: 'What is event bubbling?',
          options: [
            {
              id: 'a',
              text: 'An event that fires repeatedly',
              isCorrect: false,
            },
            {
              id: 'b',
              text: 'Event propagates from child to parent elements',
              isCorrect: true,
            },
            {
              id: 'c',
              text: 'Event propagates from parent to child',
              isCorrect: false,
            },
            { id: 'd', text: 'An error in event handling', isCorrect: false },
          ],
          explanation:
            'Bubbling means the event fires on the target first then propagates up to ancestors.',
          points: 10,
        },
        {
          topicId: jsTopic.id,
          difficulty: Difficulty.HARD,
          text: 'What does Promise.all() do?',
          options: [
            { id: 'a', text: 'Runs promises sequentially', isCorrect: false },
            {
              id: 'b',
              text: 'Returns first resolved promise',
              isCorrect: false,
            },
            {
              id: 'c',
              text: 'Waits for all promises, rejects if any fail',
              isCorrect: true,
            },
            { id: 'd', text: 'Ignores rejected promises', isCorrect: false },
          ],
          explanation:
            'Promise.all() resolves when ALL promises resolve, or rejects if ANY one rejects.',
          points: 15,
        },
      ],
    );
  }

  if (htmlTopic) {
    practiceQs.push(
      ...[
        {
          topicId: htmlTopic.id,
          difficulty: Difficulty.EASY,
          text: 'Which tag creates a hyperlink?',
          options: [
            { id: 'a', text: '<link>', isCorrect: false },
            { id: 'b', text: '<href>', isCorrect: false },
            { id: 'c', text: '<a>', isCorrect: true },
            { id: 'd', text: '<url>', isCorrect: false },
          ],
          explanation: 'The <a> tag with href attribute creates hyperlinks.',
          points: 10,
        },
        {
          topicId: htmlTopic.id,
          difficulty: Difficulty.MEDIUM,
          text: 'What is the purpose of semantic HTML?',
          options: [
            { id: 'a', text: 'Makes pages load faster', isCorrect: false },
            { id: 'b', text: 'Adds styling to elements', isCorrect: false },
            {
              id: 'c',
              text: 'Conveys meaning and improves accessibility',
              isCorrect: true,
            },
            { id: 'd', text: 'Only affects SEO', isCorrect: false },
          ],
          explanation:
            'Semantic HTML helps browsers, assistive tech, and search engines understand page structure.',
          points: 10,
        },
      ],
    );
  }

  if (cssTopic) {
    practiceQs.push(
      ...[
        {
          topicId: cssTopic.id,
          difficulty: Difficulty.MEDIUM,
          text: 'What is the CSS Box Model?',
          options: [
            { id: 'a', text: 'A grid system', isCorrect: false },
            {
              id: 'b',
              text: 'Content, padding, border, margin around an element',
              isCorrect: true,
            },
            { id: 'c', text: 'A flexbox technique', isCorrect: false },
            { id: 'd', text: 'A color system', isCorrect: false },
          ],
          explanation:
            'Every element is a box: content → padding → border → margin from inside out.',
          points: 10,
        },
        {
          topicId: cssTopic.id,
          difficulty: Difficulty.HARD,
          text: 'What does z-index control?',
          options: [
            { id: 'a', text: 'Element transparency', isCorrect: false },
            { id: 'b', text: 'Element size', isCorrect: false },
            { id: 'c', text: 'Stacking order on the z-axis', isCorrect: true },
            { id: 'd', text: 'Font size', isCorrect: false },
          ],
          explanation:
            'z-index controls which element appears on top when elements overlap.',
          points: 15,
        },
      ],
    );
  }

  if (reactTopic) {
    practiceQs.push(
      ...[
        {
          topicId: reactTopic.id,
          difficulty: Difficulty.MEDIUM,
          text: 'When does useEffect run by default?',
          options: [
            { id: 'a', text: 'Only on mount', isCorrect: false },
            { id: 'b', text: 'Only on unmount', isCorrect: false },
            { id: 'c', text: 'After every render', isCorrect: true },
            { id: 'd', text: 'Never by default', isCorrect: false },
          ],
          explanation:
            'Without a dependency array, useEffect runs after EVERY render.',
          points: 10,
        },
        {
          topicId: reactTopic.id,
          difficulty: Difficulty.HARD,
          text: 'What is React.memo?',
          options: [
            { id: 'a', text: 'Stores data in localStorage', isCorrect: false },
            {
              id: 'b',
              text: 'Caches a component to skip re-render if props unchanged',
              isCorrect: true,
            },
            { id: 'c', text: 'Creates a memory leak', isCorrect: false },
            { id: 'd', text: 'Manages global state', isCorrect: false },
          ],
          explanation:
            "React.memo is a HOC that prevents re-rendering if props haven't changed.",
          points: 15,
        },
      ],
    );
  }

  if (gitTopic) {
    practiceQs.push({
      topicId: gitTopic.id,
      difficulty: Difficulty.EASY,
      text: 'What does git commit do?',
      options: [
        { id: 'a', text: 'Uploads code to GitHub', isCorrect: false },
        {
          id: 'b',
          text: 'Saves staged changes to local repo history',
          isCorrect: true,
        },
        { id: 'c', text: 'Creates a new branch', isCrect: false },
        { id: 'd', text: 'Merges branches', isCorrect: false },
      ],
      explanation:
        'git commit saves your staged changes as a snapshot in the local repository history.',
      points: 10,
    });
  }

  if (practiceQs.length > 0) {
    await prisma.question.createMany({ data: practiceQs });
    console.log(`✅ Created ${practiceQs.length} practice questions`);
  }

  // ============== RESOURCES ==============
  const resources = [
    {
      topicId: jsTopic?.id || courseJS.id,
      title: 'MDN JavaScript Reference',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',
      type: ResourceType.DOCUMENTATION,
      difficulty: Difficulty.MEDIUM,
      description: 'The complete JS reference on MDN',
    },
    {
      topicId: jsTopic?.id || courseJS.id,
      title: 'Eloquent JavaScript (Free Book)',
      url: 'https://eloquentjavascript.net/',
      type: ResourceType.TUTORIAL,
      difficulty: Difficulty.MEDIUM,
      description: 'A modern introduction to programming with JavaScript',
    },
    {
      topicId: jsTopic?.id || courseJS.id,
      title: 'JS Array Methods Cheatsheet',
      url: 'https://javascript.info/array-methods',
      type: ResourceType.ARTICLE,
      difficulty: Difficulty.EASY,
      description: 'All array methods with examples',
    },
    {
      topicId: reactTopic?.id || courseJS.id,
      title: 'React DevTools Guide',
      url: 'https://react.dev/learn/react-developer-tools',
      type: ResourceType.DOCUMENTATION,
      difficulty: Difficulty.EASY,
      description: 'Install and use React DevTools for debugging',
    },
    {
      topicId: reactTopic?.id || courseJS.id,
      title: 'React Hooks Deep Dive (Video)',
      url: 'https://www.youtube.com/watch?v=TNhaISOUy6Q',
      type: ResourceType.VIDEO,
      difficulty: Difficulty.MEDIUM,
      learningStyle: LearningStyle.VISUAL,
      description: '1-hour video covering all React Hooks with examples',
    },
    {
      topicId: cssTopic?.id || courseJS.id,
      title: 'Flexbox Froggy (Interactive)',
      url: 'https://flexboxfroggy.com/',
      type: ResourceType.EXERCISE,
      difficulty: Difficulty.EASY,
      description: 'Learn flexbox by completing fun challenges',
    },
    {
      topicId: htmlTopic?.id || courseJS.id,
      title: 'HTML Validator',
      url: 'https://validator.w3.org/',
      type: ResourceType.DOCUMENTATION,
      difficulty: Difficulty.EASY,
      description: 'Validate your HTML for errors and warnings',
    },
    {
      topicId: courseJS.id,
      title: 'JavaScript 30 — 30 Day Coding Challenge',
      url: 'https://javascript30.com/',
      type: ResourceType.EXERCISE,
      difficulty: Difficulty.MEDIUM,
      description: 'Build 30 things in 30 days with vanilla JS',
    },
  ].filter((r) => r.topicId);

  await prisma.resource.createMany({ data: resources as any });
  console.log(`✅ Created ${resources.length} resources`);

  // ============== ASSIGNMENTS ==============
  // Check existing to avoid duplicates
  const existingAssignments = await prisma.assignment.count({
    where: { topicId: courseJS.id },
  });

  if (existingAssignments < 2) {
    const ass1 = await prisma.assignment.create({
      data: {
        topicId: courseJS.id,
        createdById: tutor.id,
        title: 'Exercise: Array Method Challenges',
        description:
          '## Array Challenges\n\nSolve the following using array methods:\n\n1. Given `[1,2,3,4,5,6,7,8,9,10]`, return only evens doubled\n2. Find the longest word in `["apple","banana","kiwi","watermelon"]`\n3. Sum all numbers in `[10, 20, 30, 40, 50]` using reduce\n4. Transform `[{name:"Alex",age:25},{name:"Sam",age:30}]` to `["Alex (25)","Sam (30)"]`\n\nSubmit a GitHub Gist or paste your code.',
        type: 'EXERCISE',
        dueDate: new Date(Date.now() + 7 * 86400000),
        points: 50,
        requiresLink: true,
        requiresText: true,
      },
    });

    const ass2 = await prisma.assignment.create({
      data: {
        topicId: courseJS.id,
        createdById: tutor.id,
        title: 'Mini Project: Weather App',
        description:
          '## Weather App\n\nBuild a weather app using a free weather API.\n\n### Requirements:\n1. Search by city name\n2. Display temperature, weather condition, humidity\n3. Show a 3-day forecast\n4. Handle errors (city not found)\n5. Responsive design\n\n### Submission:\n- GitHub repo link\n- Live demo (Vercel/Netlify)\n- Brief explanation of your approach',
        type: 'PROJECT',
        dueDate: new Date(Date.now() + 14 * 86400000),
        points: 100,
        requiresLink: true,
        requiresFile: false,
        requiresText: true,
      },
    });

    // Demo student submitted exercise
    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: ass1.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        assignmentId: ass1.id,
        studentId: student.id,
        status: 'APPROVED',
        link: 'https://gist.github.com/alex-johnson/array-challenges',
        text: 'Used map+filter for #1, sort+slice for #2, reduce for #3, and map for #4.',
        score: 92,
        feedback:
          'Excellent work! Clean, readable solutions. Consider using flatMap for #1 as an alternative.',
        reviewedById: tutor.id,
        reviewedAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    // Demo student submitted weather app (pending review)
    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: ass2.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        assignmentId: ass2.id,
        studentId: student.id,
        status: 'IN_REVIEW',
        link: 'https://github.com/alex-johnson/weather-app',
        files: [
          {
            url: 'http://localhost:3000/uploads/submissions/screenshot.png',
            fileName: 'screenshot.png',
            fileType: 'image/png',
            fileSize: 240000,
          },
        ] as any,
        text: 'Used OpenWeatherMap API. Deployed to Vercel: https://alex-weather.vercel.app',
      },
    });

    console.log('✅ Created 2 assignments with submissions');
  } else {
    console.log('✅ Assignments already exist, skipping');
  }

  // XP update for approved assignment
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });
  if (profile && profile.xp < 200) {
    await prisma.studentProfile.update({
      where: { userId: student.id },
      data: { xp: 460 },
    });
  }

  console.log('\n🎉 Demo data seed complete!');
  console.log('Student: demo@student.com / student123');
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
