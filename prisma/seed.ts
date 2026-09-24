import 'dotenv/config';
import {
  PrismaClient,
  Role,
  Difficulty,
  ResourceType,
  LearningStyle,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ets.com' },
    update: {},
    create: {
      email: 'admin@ets.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create recruiter user
  const recruiterPassword = await bcrypt.hash('recruiter123', 10);
  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@company.com' },
    update: {},
    create: {
      email: 'recruiter@company.com',
      password: recruiterPassword,
      firstName: 'Jane',
      lastName: 'Recruiter',
      role: Role.RECRUITER,
    },
  });
  console.log(`✅ Recruiter user: ${recruiter.email}`);

  // Create topics
  const topics = [
    { name: 'HTML', description: 'HyperText Markup Language fundamentals' },
    { name: 'CSS', description: 'Cascading Style Sheets and layout' },
    { name: 'JavaScript', description: 'JavaScript programming fundamentals' },
    { name: 'TypeScript', description: 'TypeScript type system and features' },
    { name: 'React', description: 'React library and component patterns' },
    { name: 'Node.js', description: 'Server-side JavaScript with Node.js' },
    { name: 'Python', description: 'Python programming fundamentals' },
    { name: 'SQL', description: 'Structured Query Language and databases' },
    {
      name: 'Data Structures',
      description: 'Common data structures and algorithms',
    },
    { name: 'Git', description: 'Version control with Git' },
  ];

  const createdTopics: Record<string, string> = {};
  for (const topic of topics) {
    const t = await prisma.topic.upsert({
      where: { name: topic.name },
      update: {},
      create: topic,
    });
    createdTopics[t.name] = t.id;
  }
  console.log(`✅ Created ${topics.length} topics`);

  // Create sample questions
  const sampleQuestions = [
    // HTML Questions
    {
      topicId: createdTopics['HTML'],
      difficulty: Difficulty.EASY,
      text: 'What does HTML stand for?',
      options: [
        { id: 'a', text: 'Hyper Text Markup Language', isCorrect: true },
        { id: 'b', text: 'High Tech Modern Language', isCorrect: false },
        { id: 'c', text: 'Hyper Transfer Markup Language', isCorrect: false },
        { id: 'd', text: 'Home Tool Markup Language', isCorrect: false },
      ],
      explanation:
        'HTML stands for HyperText Markup Language. It is the standard markup language for creating web pages.',
      points: 10,
    },
    {
      topicId: createdTopics['HTML'],
      difficulty: Difficulty.EASY,
      text: 'Which HTML element is used for the largest heading?',
      options: [
        { id: 'a', text: '<heading>', isCorrect: false },
        { id: 'b', text: '<h6>', isCorrect: false },
        { id: 'c', text: '<h1>', isCorrect: true },
        { id: 'd', text: '<head>', isCorrect: false },
      ],
      explanation:
        '<h1> defines the most important (largest) heading. <h6> defines the least important heading.',
      points: 10,
    },
    {
      topicId: createdTopics['HTML'],
      difficulty: Difficulty.MEDIUM,
      text: 'Which attribute is used to provide an alternative text for an image?',
      options: [
        { id: 'a', text: 'title', isCorrect: false },
        { id: 'b', text: 'alt', isCorrect: true },
        { id: 'c', text: 'src', isCorrect: false },
        { id: 'd', text: 'description', isCorrect: false },
      ],
      explanation:
        'The alt attribute provides alternative text for an image if it cannot be displayed.',
      points: 10,
    },
    // CSS Questions
    {
      topicId: createdTopics['CSS'],
      difficulty: Difficulty.EASY,
      text: 'Which CSS property is used to change the text color?',
      options: [
        { id: 'a', text: 'font-color', isCorrect: false },
        { id: 'b', text: 'text-color', isCorrect: false },
        { id: 'c', text: 'color', isCorrect: true },
        { id: 'd', text: 'foreground-color', isCorrect: false },
      ],
      explanation: 'The color property sets the color of text content.',
      points: 10,
    },
    {
      topicId: createdTopics['CSS'],
      difficulty: Difficulty.MEDIUM,
      text: 'What is the default value of the position property?',
      options: [
        { id: 'a', text: 'relative', isCorrect: false },
        { id: 'b', text: 'absolute', isCorrect: false },
        { id: 'c', text: 'fixed', isCorrect: false },
        { id: 'd', text: 'static', isCorrect: true },
      ],
      explanation:
        'The default position value is static. Static positioned elements are not affected by top, bottom, left, right properties.',
      points: 10,
    },
    {
      topicId: createdTopics['CSS'],
      difficulty: Difficulty.HARD,
      text: 'Which CSS property creates space between the content and the border?',
      options: [
        { id: 'a', text: 'margin', isCorrect: false },
        { id: 'b', text: 'padding', isCorrect: true },
        { id: 'c', text: 'spacing', isCorrect: false },
        { id: 'd', text: 'border-spacing', isCorrect: false },
      ],
      explanation:
        "Padding creates space between an element's content and its border. Margin creates space outside the border.",
      points: 15,
    },
    // JavaScript Questions
    {
      topicId: createdTopics['JavaScript'],
      difficulty: Difficulty.EASY,
      text: 'Which keyword is used to declare a variable that cannot be reassigned?',
      options: [
        { id: 'a', text: 'var', isCorrect: false },
        { id: 'b', text: 'let', isCorrect: false },
        { id: 'c', text: 'const', isCorrect: true },
        { id: 'd', text: 'final', isCorrect: false },
      ],
      explanation:
        'const declares a variable that cannot be reassigned after initialization.',
      points: 10,
    },
    {
      topicId: createdTopics['JavaScript'],
      difficulty: Difficulty.MEDIUM,
      text: 'What is the output of: typeof null?',
      options: [
        { id: 'a', text: '"null"', isCorrect: false },
        { id: 'b', text: '"undefined"', isCorrect: false },
        { id: 'c', text: '"object"', isCorrect: true },
        { id: 'd', text: '"boolean"', isCorrect: false },
      ],
      explanation:
        'typeof null returns "object". This is a known JavaScript quirk from its early implementation.',
      points: 10,
    },
    {
      topicId: createdTopics['JavaScript'],
      difficulty: Difficulty.MEDIUM,
      text: 'Which array method creates a new array with elements that pass a test?',
      options: [
        { id: 'a', text: '.map()', isCorrect: false },
        { id: 'b', text: '.filter()', isCorrect: true },
        { id: 'c', text: '.reduce()', isCorrect: false },
        { id: 'd', text: '.find()', isCorrect: false },
      ],
      explanation:
        '.filter() creates a new array with all elements that pass the provided test function.',
      points: 10,
    },
    {
      topicId: createdTopics['JavaScript'],
      difficulty: Difficulty.HARD,
      text: 'What is a closure in JavaScript?',
      options: [
        {
          id: 'a',
          text: 'A function that has no return value',
          isCorrect: false,
        },
        {
          id: 'b',
          text: 'A function along with its lexical environment',
          isCorrect: true,
        },
        { id: 'c', text: 'A function that calls itself', isCorrect: false },
        {
          id: 'd',
          text: 'A function that takes another function as argument',
          isCorrect: false,
        },
      ],
      explanation:
        'A closure is a function bundled with its lexical environment. It has access to variables from its outer scope even after the outer function has returned.',
      points: 15,
    },
    // React Questions
    {
      topicId: createdTopics['React'],
      difficulty: Difficulty.EASY,
      text: 'What hook is used to manage state in a functional component?',
      options: [
        { id: 'a', text: 'useEffect', isCorrect: false },
        { id: 'b', text: 'useState', isCorrect: true },
        { id: 'c', text: 'useContext', isCorrect: false },
        { id: 'd', text: 'useReducer', isCorrect: false },
      ],
      explanation:
        'useState is the primary hook for adding state to functional components.',
      points: 10,
    },
    {
      topicId: createdTopics['React'],
      difficulty: Difficulty.MEDIUM,
      text: 'What is the virtual DOM in React?',
      options: [
        {
          id: 'a',
          text: 'A copy of the real DOM stored in the browser',
          isCorrect: false,
        },
        {
          id: 'b',
          text: 'A lightweight JavaScript representation of the real DOM',
          isCorrect: true,
        },
        {
          id: 'c',
          text: 'A server-side rendering technique',
          isCorrect: false,
        },
        { id: 'd', text: 'A CSS-in-JS solution', isCorrect: false },
      ],
      explanation:
        'The virtual DOM is a lightweight JavaScript representation of the actual DOM. React uses it to efficiently determine what changes need to be made to the real DOM.',
      points: 10,
    },
    // Python Questions
    {
      topicId: createdTopics['Python'],
      difficulty: Difficulty.EASY,
      text: 'How do you create a list in Python?',
      options: [
        { id: 'a', text: 'list = (1, 2, 3)', isCorrect: false },
        { id: 'b', text: 'list = [1, 2, 3]', isCorrect: true },
        { id: 'c', text: 'list = {1, 2, 3}', isCorrect: false },
        { id: 'd', text: 'list = <1, 2, 3>', isCorrect: false },
      ],
      explanation: 'Lists in Python are created using square brackets [].',
      points: 10,
    },
    // SQL Questions
    {
      topicId: createdTopics['SQL'],
      difficulty: Difficulty.EASY,
      text: 'Which SQL statement is used to retrieve data from a database?',
      options: [
        { id: 'a', text: 'GET', isCorrect: false },
        { id: 'b', text: 'FETCH', isCorrect: false },
        { id: 'c', text: 'SELECT', isCorrect: true },
        { id: 'd', text: 'RETRIEVE', isCorrect: false },
      ],
      explanation:
        'The SELECT statement is used to query and retrieve data from a database.',
      points: 10,
    },
    // Git Questions
    {
      topicId: createdTopics['Git'],
      difficulty: Difficulty.EASY,
      text: 'Which command initializes a new Git repository?',
      options: [
        { id: 'a', text: 'git start', isCorrect: false },
        { id: 'b', text: 'git init', isCorrect: true },
        { id: 'c', text: 'git create', isCorrect: false },
        { id: 'd', text: 'git new', isCorrect: false },
      ],
      explanation:
        'git init creates a new Git repository in the current directory.',
      points: 10,
    },
  ];

  for (const question of sampleQuestions) {
    await prisma.question.create({ data: question });
  }
  console.log(`✅ Created ${sampleQuestions.length} sample questions`);

  // Create assessment configs per track
  const assessmentConfigs = [
    // Frontend
    {
      name: 'Frontend Developer Assessment',
      description: 'Full assessment for frontend developer track',
      track: 'frontend',
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
      topicDistribution: {
        [createdTopics['HTML']]: 3,
        [createdTopics['CSS']]: 3,
        [createdTopics['JavaScript']]: 5,
        [createdTopics['React']]: 3,
        [createdTopics['Git']]: 1,
      },
      difficultyDistribution: { EASY: 4, MEDIUM: 8, HARD: 3 },
    },
    {
      name: 'Frontend Developer - Booth',
      description: 'Quick frontend assessment for event booth',
      track: 'frontend',
      totalQuestions: 10,
      timeLimitMinutes: 12,
      isBoothMode: true,
      topicDistribution: {
        [createdTopics['HTML']]: 2,
        [createdTopics['CSS']]: 2,
        [createdTopics['JavaScript']]: 4,
        [createdTopics['React']]: 2,
      },
    },
    // Backend
    {
      name: 'Backend Developer Assessment',
      description: 'Full assessment for backend developer track',
      track: 'backend',
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
      topicDistribution: {
        [createdTopics['Node.js']]: 4,
        [createdTopics['SQL']]: 4,
        [createdTopics['JavaScript']]: 3,
        [createdTopics['Data Structures']]: 3,
        [createdTopics['Git']]: 1,
      },
      difficultyDistribution: { EASY: 4, MEDIUM: 7, HARD: 4 },
    },
    {
      name: 'Backend Developer - Booth',
      description: 'Quick backend assessment for event booth',
      track: 'backend',
      totalQuestions: 10,
      timeLimitMinutes: 12,
      isBoothMode: true,
      topicDistribution: {
        [createdTopics['Node.js']]: 3,
        [createdTopics['SQL']]: 3,
        [createdTopics['JavaScript']]: 2,
        [createdTopics['Data Structures']]: 2,
      },
    },
    // Cybersecurity
    {
      name: 'Cybersecurity Assessment',
      description: 'Full assessment for cybersecurity track',
      track: 'cybersecurity',
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
    },
    {
      name: 'Cybersecurity - Booth',
      description: 'Quick cybersecurity assessment for event booth',
      track: 'cybersecurity',
      totalQuestions: 10,
      timeLimitMinutes: 12,
      isBoothMode: true,
    },
    // Data Science
    {
      name: 'Data Science Assessment',
      description: 'Full assessment for data science track',
      track: 'data-science',
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
      topicDistribution: {
        [createdTopics['Python']]: 5,
        [createdTopics['SQL']]: 4,
        [createdTopics['Data Structures']]: 4,
        [createdTopics['Git']]: 2,
      },
    },
    // UI/UX Design
    {
      name: 'UI/UX Design Assessment',
      description: 'Full assessment for UI/UX design track',
      track: 'ui-ux',
      totalQuestions: 15,
      timeLimitMinutes: 20,
      isBoothMode: false,
    },
    // DevOps
    {
      name: 'DevOps Assessment',
      description: 'Full assessment for DevOps track',
      track: 'devops',
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
    },
    // Product Management
    {
      name: 'Product Management Assessment',
      description: 'Full assessment for product management track',
      track: 'product-management',
      totalQuestions: 15,
      timeLimitMinutes: 20,
      isBoothMode: false,
    },
    // General / Fallback
    {
      name: 'General Tech Assessment',
      description:
        'General assessment covering all topics (for undecided students)',
      track: null,
      totalQuestions: 15,
      timeLimitMinutes: 25,
      isBoothMode: false,
    },
    {
      name: 'General Tech - Booth',
      description: 'Quick general assessment for event booth',
      track: null,
      totalQuestions: 10,
      timeLimitMinutes: 12,
      isBoothMode: true,
    },
  ];

  for (const config of assessmentConfigs) {
    await prisma.assessmentConfig.create({ data: config });
  }
  console.log(
    `✅ Created ${assessmentConfigs.length} assessment configs (by track)`,
  );

  // Create sample resources
  const sampleResources = [
    {
      topicId: createdTopics['HTML'],
      title: 'MDN HTML Basics',
      url: 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics',
      type: ResourceType.DOCUMENTATION,
      difficulty: Difficulty.EASY,
      description: 'Official MDN guide to HTML basics',
    },
    {
      topicId: createdTopics['CSS'],
      title: 'CSS Tricks - Flexbox Guide',
      url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
      type: ResourceType.ARTICLE,
      difficulty: Difficulty.MEDIUM,
      description: 'Complete guide to CSS Flexbox layout',
    },
    {
      topicId: createdTopics['JavaScript'],
      title: 'JavaScript.info - The Modern JavaScript Tutorial',
      url: 'https://javascript.info/',
      type: ResourceType.TUTORIAL,
      difficulty: Difficulty.EASY,
      description: 'Comprehensive JavaScript tutorial from basics to advanced',
    },
    {
      topicId: createdTopics['JavaScript'],
      title: 'Traversy Media - JS Crash Course',
      url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
      type: ResourceType.VIDEO,
      difficulty: Difficulty.EASY,
      learningStyle: LearningStyle.VISUAL,
      description: 'Video crash course on JavaScript fundamentals',
    },
    {
      topicId: createdTopics['React'],
      title: 'React Official Documentation',
      url: 'https://react.dev/learn',
      type: ResourceType.DOCUMENTATION,
      difficulty: Difficulty.MEDIUM,
      description: 'Official React documentation and tutorials',
    },
    {
      topicId: createdTopics['Python'],
      title: 'Python Official Tutorial',
      url: 'https://docs.python.org/3/tutorial/',
      type: ResourceType.DOCUMENTATION,
      difficulty: Difficulty.EASY,
      description: 'Official Python tutorial for beginners',
    },
  ];

  for (const resource of sampleResources) {
    await prisma.resource.create({ data: resource });
  }
  console.log(`✅ Created ${sampleResources.length} sample resources`);

  console.log('\n🎉 Seeding complete!');
  console.log('\nTest accounts:');
  console.log('  Admin:     admin@ets.com / admin123');
  console.log('  Recruiter: recruiter@company.com / recruiter123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
