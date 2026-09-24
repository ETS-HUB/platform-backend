import 'dotenv/config';
import {
  PrismaClient,
  Role,
  Difficulty,
  ContentBlockType,
  ExperienceLevel,
  LearningStyle,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Full JavaScript course seed...\n');

  // Users
  const pw = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ets.com',
      password: pw,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });
  const tutor = await prisma.user.create({
    data: {
      email: 'sarah.tutor@ets.com',
      password: pw,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: Role.TUTOR,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahT',
    },
  });
  const recruiter = await prisma.user.create({
    data: {
      email: 'recruiter@company.com',
      password: pw,
      firstName: 'Jane',
      lastName: 'Recruiter',
      role: Role.RECRUITER,
    },
  });

  const spw = await bcrypt.hash('student123', 10);
  const student = await prisma.user.create({
    data: {
      email: 'demo@student.com',
      password: spw,
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
  const others: any[] = [];
  for (const n of [
    'Emily',
    'Mike',
    'Sophia',
    'James',
    'Olivia',
    'Ethan',
    'Mia',
    'Daniel',
  ]) {
    const u = await prisma.user.create({
      data: {
        email: `${n.toLowerCase()}@student.com`,
        password: spw,
        firstName: n,
        lastName: 'Student',
        role: Role.STUDENT,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${n}`,
        profile: {
          create: {
            goal: 'Frontend Developer',
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
    others.push(u);
  }
  console.log('✅ Users created');

  // Category + Course
  const catProg = await prisma.topic.create({
    data: {
      name: 'Programming',
      description: 'Learn to code',
      imageUrl: null,
      coverImage:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    },
  });
  const catDesign = await prisma.topic.create({
    data: {
      name: 'Design',
      description: 'UI/UX and visual design',
      imageUrl: null,
    },
  });

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
      description: 'Build UIs with React',
      parentId: catProg.id,
      track: 'frontend',
      imageUrl: null,
      isSequential: true,
    },
  });
  const courseUX = await prisma.topic.create({
    data: {
      name: 'UX Fundamentals',
      description: 'User research and interface design',
      parentId: catDesign.id,
      track: 'ui-ux',
      imageUrl: null,
      isSequential: false,
    },
  });

  // Tutor assignment
  await prisma.courseTutor.create({
    data: { userId: tutor.id, topicId: courseJS.id },
  });
  console.log('✅ Categories, courses, tutor assigned');

  // ====== JS LESSON 1: Variables & Data Types ======
  await prisma.lesson.create({
    data: {
      topicId: courseJS.id,
      title: 'Variables & Data Types',
      description: 'Learn var, let, const and JavaScript data types',
      order: 1,
      duration: 15,
      isPublished: true,
      contentBlocks: {
        create: [
          {
            type: ContentBlockType.TEXT,
            order: 0,
            title: 'What are Variables?',
            content:
              '## Variables in JavaScript\n\nA variable is a named container for storing data values. Think of it as a labeled box.\n\n### Three ways to declare:\n- `var` — old way (function-scoped, avoid)\n- `let` — modern (block-scoped, reassignable)\n- `const` — modern (block-scoped, NOT reassignable)\n\n### Rule of thumb:\nUse `const` by default. Use `let` only when you need to reassign.',
            questions: {
              create: [
                {
                  order: 0,
                  difficulty: Difficulty.EASY,
                  text: 'Which is the recommended default keyword for declaring variables?',
                  options: [
                    { id: 'a', text: 'var', isCorrect: false },
                    { id: 'b', text: 'let', isCorrect: false },
                    { id: 'c', text: 'const', isCorrect: true },
                    { id: 'd', text: 'function', isCorrect: false },
                  ] as any,
                  explanation:
                    'const is preferred because it prevents accidental reassignment.',
                  points: 10,
                },
              ],
            },
          },
          {
            type: ContentBlockType.VIDEO,
            order: 1,
            title: 'Watch: Variables Explained in 8 Minutes',
            content: 'https://www.youtube.com/watch?v=9aGMkNj5LNw',
            overview:
              'This video covers var vs let vs const with visual examples. Pay attention to the scope demonstration at 4:30.',
            metadata: { duration: '8:24', provider: 'youtube' },
            questions: {
              create: [
                {
                  order: 0,
                  difficulty: Difficulty.EASY,
                  text: 'What happens if you try to reassign a const variable?',
                  options: [
                    { id: 'a', text: 'It works fine', isCorrect: false },
                    { id: 'b', text: 'TypeError is thrown', isCorrect: true },
                    {
                      id: 'c',
                      text: 'The value silently stays the same',
                      isCorrect: false,
                    },
                    {
                      id: 'd',
                      text: 'It creates a new variable',
                      isCorrect: false,
                    },
                  ] as any,
                  explanation:
                    'Reassigning a const throws a TypeError at runtime.',
                  points: 10,
                },
              ],
            },
          },
          {
            type: ContentBlockType.CODE,
            order: 2,
            title: 'Try It: Declaring Variables',
            content:
              "// const - cannot reassign\nconst name = 'Alex';\nconst age = 25;\nconst isStudent = true;\n\n// let - can reassign\nlet score = 0;\nscore = 10; // ✅ OK\nscore = score + 5; // ✅ OK\n\n// This would throw an error:\n// name = 'Bob'; // ❌ TypeError!\n\nconsole.log(name, age, isStudent, score);",
            overview:
              'Copy this code into your browser console (F12) and experiment. Try uncommenting the last line to see the error.',
            metadata: { language: 'javascript' },
          },
          {
            type: ContentBlockType.TEXT,
            order: 3,
            title: 'Data Types',
            content:
              '## JavaScript Data Types\n\n### Primitive Types:\n| Type | Example | Description |\n|------|---------|-------------|\n| String | `"hello"` | Text |\n| Number | `42`, `3.14` | All numbers |\n| Boolean | `true`, `false` | Logic |\n| null | `null` | Intentionally empty |\n| undefined | `undefined` | Not yet assigned |\n\n### Key insight:\nJavaScript is *dynamically typed* — you don\'t declare types, the engine figures it out.',
            questions: {
              create: [
                {
                  order: 0,
                  difficulty: Difficulty.EASY,
                  text: 'How many number types does JavaScript have?',
                  options: [
                    { id: 'a', text: 'Two (int and float)', isCorrect: false },
                    { id: 'b', text: 'One (number)', isCorrect: true },
                    {
                      id: 'c',
                      text: 'Three (int, float, BigInt)',
                      isCorrect: false,
                    },
                    { id: 'd', text: 'Four', isCorrect: false },
                  ] as any,
                  explanation:
                    'JavaScript has a single "number" type for all numeric values (integers and decimals).',
                  points: 10,
                },
              ],
            },
          },
          {
            type: ContentBlockType.RESOURCE_LINK,
            order: 4,
            title: 'Reference: MDN Variables Guide',
            content:
              'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/Variables',
            overview:
              'The official MDN guide covers everything in this lesson plus edge cases. Bookmark for reference.',
          },
        ],
      },
      questions: {
        create: [
          {
            order: 0,
            difficulty: Difficulty.EASY,
            text: 'Which keyword declares a variable that cannot be reassigned?',
            options: [
              { id: 'a', text: 'var', isCorrect: false },
              { id: 'b', text: 'let', isCorrect: false },
              { id: 'c', text: 'const', isCorrect: true },
              { id: 'd', text: 'final', isCorrect: false },
            ] as any,
            explanation: 'const creates a read-only reference.',
            points: 10,
          },
          {
            order: 1,
            difficulty: Difficulty.MEDIUM,
            text: 'What is the typeof null in JavaScript?',
            options: [
              { id: 'a', text: '"null"', isCorrect: false },
              { id: 'b', text: '"object"', isCorrect: true },
              { id: 'c', text: '"undefined"', isCorrect: false },
              { id: 'd', text: '"boolean"', isCorrect: false },
            ] as any,
            explanation:
              'typeof null === "object" is a known JS quirk from the first implementation.',
            points: 10,
          },
        ],
      },
    },
  });
  console.log('  ✅ Lesson 1: Variables & Data Types');

  // ====== JS LESSON 2: Arrays & Objects ======
  await prisma.lesson.create({
    data: {
      topicId: courseJS.id,
      title: 'Arrays & Objects',
      description: 'Working with collections and structured data',
      order: 2,
      duration: 20,
      isPublished: true,
      contentBlocks: {
        create: [
          {
            type: ContentBlockType.TEXT,
            order: 0,
            title: 'Arrays: Ordered Lists',
            content:
              "## Arrays\n\nArrays store ordered collections.\n\n```javascript\nconst fruits = ['apple', 'banana', 'cherry'];\nconsole.log(fruits[0]); // 'apple'\nconsole.log(fruits.length); // 3\n```\n\n### Common methods:\n- `.push(item)` — add to end\n- `.pop()` — remove from end\n- `.map(fn)` — transform each element\n- `.filter(fn)` — keep matching elements\n- `.find(fn)` — first match",
            questions: {
              create: [
                {
                  order: 0,
                  difficulty: Difficulty.EASY,
                  text: 'What index is the first element of an array?',
                  options: [
                    { id: 'a', text: '0', isCorrect: true },
                    { id: 'b', text: '1', isCorrect: false },
                    { id: 'c', text: '-1', isCorrect: false },
                    { id: 'd', text: 'first', isCorrect: false },
                  ] as any,
                  explanation:
                    'Arrays are zero-indexed. The first element is at index 0.',
                  points: 10,
                },
              ],
            },
          },
          {
            type: ContentBlockType.VIDEO,
            order: 1,
            title: 'Watch: Arrays & Objects Masterclass',
            content: 'https://www.youtube.com/watch?v=R8rmfD9Y5-c',
            overview:
              'A 15-minute deep dive into array methods and object patterns. The destructuring section at 10:00 is especially important.',
            metadata: { duration: '15:10', provider: 'youtube' },
            questions: {
              create: [
                {
                  order: 0,
                  difficulty: Difficulty.MEDIUM,
                  text: 'Which method returns a NEW array without modifying the original?',
                  options: [
                    { id: 'a', text: '.push()', isCorrect: false },
                    { id: 'b', text: '.splice()', isCorrect: false },
                    { id: 'c', text: '.map()', isCorrect: true },
                    { id: 'd', text: '.sort()', isCorrect: false },
                  ] as any,
                  explanation:
                    '.map() always returns a new array. .push() and .splice() mutate the original.',
                  points: 10,
                },
              ],
            },
          },
          {
            type: ContentBlockType.CODE,
            order: 2,
            title: 'Practice: Array Methods',
            content:
              'const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\n// Transform: double each number\nconst doubled = numbers.map(n => n * 2);\n// [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]\n\n// Filter: keep only evens\nconst evens = numbers.filter(n => n % 2 === 0);\n// [2, 4, 6, 8, 10]\n\n// Reduce: sum all numbers\nconst sum = numbers.reduce((acc, n) => acc + n, 0);\n// 55\n\n// Find: first number > 5\nconst found = numbers.find(n => n > 5);\n// 6',
            overview:
              'Run each example separately and predict the output before checking.',
            metadata: { language: 'javascript' },
          },
          {
            type: ContentBlockType.TEXT,
            order: 3,
            title: 'Objects: Key-Value Pairs',
            content:
              "## Objects\n\nObjects store data as key-value pairs.\n\n```javascript\nconst person = {\n  name: 'Alex',\n  age: 25,\n  isStudent: true,\n  skills: ['HTML', 'CSS', 'JavaScript']\n};\n\n// Access\nconsole.log(person.name); // 'Alex'\nconsole.log(person['age']); // 25\n\n// Destructuring\nconst { name, age } = person;\n```",
            questions: {
              create: [
                {
                  order: 0,
                  difficulty: Difficulty.EASY,
                  text: 'How do you access object properties?',
                  options: [
                    {
                      id: 'a',
                      text: 'dot notation (obj.key) or bracket notation (obj["key"])',
                      isCorrect: true,
                    },
                    { id: 'b', text: 'Only dot notation', isCorrect: false },
                    {
                      id: 'c',
                      text: 'Only bracket notation',
                      isCorrect: false,
                    },
                    { id: 'd', text: 'Using .get() method', isCorrect: false },
                  ] as any,
                  explanation:
                    'Both dot and bracket notation work. Bracket is needed for dynamic keys or keys with special characters.',
                  points: 10,
                },
              ],
            },
          },
          {
            type: ContentBlockType.RESOURCE_LINK,
            order: 4,
            title: 'Deep Dive: JavaScript.info Arrays',
            content: 'https://javascript.info/array-methods',
            overview:
              'Comprehensive reference for all array methods with interactive examples.',
          },
        ],
      },
      questions: {
        create: [
          {
            order: 0,
            difficulty: Difficulty.MEDIUM,
            text: 'What does .filter() return?',
            options: [
              { id: 'a', text: 'A single element', isCorrect: false },
              {
                id: 'b',
                text: 'A new array with matching elements',
                isCorrect: true,
              },
              { id: 'c', text: 'true or false', isCorrect: false },
              {
                id: 'd',
                text: 'The original array modified',
                isCorrect: false,
              },
            ] as any,
            explanation:
              '.filter() creates a new array containing only elements where the callback returned true.',
            points: 10,
          },
          {
            order: 1,
            difficulty: Difficulty.MEDIUM,
            text: 'What is destructuring?',
            options: [
              { id: 'a', text: 'Deleting object properties', isCorrect: false },
              {
                id: 'b',
                text: 'Extracting values into variables',
                isCorrect: true,
              },
              { id: 'c', text: 'Merging objects', isCorrect: false },
              { id: 'd', text: 'Converting to array', isCorrect: false },
            ] as any,
            explanation:
              'Destructuring extracts values from arrays/objects into distinct variables.',
            points: 10,
          },
        ],
      },
    },
  });
  console.log('  ✅ Lesson 2: Arrays & Objects');

  // ====== JS LESSONS 3-8 (condensed but with full content blocks + questions) ======
  const remainingLessons = [
    {
      title: 'Control Flow & Loops',
      desc: 'if/else, switch, for, while, for...of',
      order: 3,
      dur: 18,
      text: '## Control Flow\n\n### If/Else\n```javascript\nif (score >= 90) grade = "A";\nelse if (score >= 80) grade = "B";\nelse grade = "C";\n```\n\n### Ternary\n```javascript\nconst status = age >= 18 ? "adult" : "minor";\n```\n\n### Loops\n```javascript\nfor (let i = 0; i < 5; i++) { console.log(i); }\nfor (const item of array) { console.log(item); }\nwhile (condition) { /* ... */ }\n```',
      video: 'https://www.youtube.com/watch?v=s9wW2PpJsmQ',
      videoDur: '11:45',
      code: "// FizzBuzz challenge\nfor (let i = 1; i <= 30; i++) {\n  if (i % 15 === 0) console.log('FizzBuzz');\n  else if (i % 3 === 0) console.log('Fizz');\n  else if (i % 5 === 0) console.log('Buzz');\n  else console.log(i);\n}",
      qText: 'What are the 3 parts of a for loop?',
      qOptions: [
        { id: 'a', text: 'init, condition, increment', isCorrect: true },
        { id: 'b', text: 'start, end, step', isCorrect: false },
        { id: 'c', text: 'begin, while, next', isCorrect: false },
        { id: 'd', text: 'var, check, update', isCorrect: false },
      ],
    },
    {
      title: 'Functions & Scope',
      desc: 'Declarations, expressions, arrow functions, closures',
      order: 4,
      dur: 20,
      text: '## Functions\n\n### Declaration\n```javascript\nfunction greet(name) { return `Hello, ${name}!`; }\n```\n\n### Arrow Function\n```javascript\nconst greet = (name) => `Hello, ${name}!`;\n```\n\n### Closure\nA function that remembers its outer variables:\n```javascript\nfunction counter() {\n  let count = 0;\n  return () => ++count;\n}\nconst inc = counter();\ninc(); // 1\ninc(); // 2\n```',
      video: 'https://www.youtube.com/watch?v=FOD408a0EzU',
      videoDur: '14:32',
      code: '// Higher-order function example\nconst multiply = (factor) => (number) => number * factor;\n\nconst double = multiply(2);\nconst triple = multiply(3);\n\nconsole.log(double(5));  // 10\nconsole.log(triple(5));  // 15',
      qText: 'What is a closure?',
      qOptions: [
        {
          id: 'a',
          text: 'A function with its lexical environment',
          isCorrect: true,
        },
        { id: 'b', text: 'A function that calls itself', isCorrect: false },
        { id: 'c', text: 'A function without parameters', isCorrect: false },
        { id: 'd', text: 'An anonymous function', isCorrect: false },
      ],
    },
    {
      title: 'DOM Manipulation',
      desc: 'Selecting, creating, and modifying HTML elements with JavaScript',
      order: 5,
      dur: 22,
      text: '## The DOM\n\nThe Document Object Model is a tree of HTML elements that JavaScript can interact with.\n\n### Selecting Elements\n```javascript\nconst el = document.querySelector(".my-class");\nconst all = document.querySelectorAll("p");\nconst byId = document.getElementById("app");\n```\n\n### Modifying\n```javascript\nel.textContent = "New text";\nel.style.color = "red";\nel.classList.add("active");\n```\n\n### Creating\n```javascript\nconst div = document.createElement("div");\ndiv.textContent = "Hello";\ndocument.body.appendChild(div);\n```',
      video: 'https://www.youtube.com/watch?v=0ik6X4DJKCc',
      videoDur: '16:20',
      code: "// Create a todo item dynamically\nconst list = document.querySelector('#todo-list');\n\nfunction addTodo(text) {\n  const li = document.createElement('li');\n  li.textContent = text;\n  li.addEventListener('click', () => li.remove());\n  list.appendChild(li);\n}\n\naddTodo('Learn JavaScript');\naddTodo('Build a project');",
      qText: 'Which method selects the FIRST matching element?',
      qOptions: [
        { id: 'a', text: 'querySelector()', isCorrect: true },
        { id: 'b', text: 'querySelectorAll()', isCorrect: false },
        { id: 'c', text: 'getElementsByClassName()', isCorrect: false },
        { id: 'd', text: 'getElementById()', isCorrect: false },
      ],
    },
    {
      title: 'Async JavaScript',
      desc: 'Callbacks, Promises, async/await, fetch API',
      order: 6,
      dur: 25,
      text: '## Asynchronous JavaScript\n\nJS is single-threaded but handles async with an event loop.\n\n### Promise\n```javascript\nfetch("https://api.example.com/data")\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));\n```\n\n### Async/Await (preferred)\n```javascript\nasync function getData() {\n  try {\n    const res = await fetch("https://api.example.com/data");\n    const data = await res.json();\n    return data;\n  } catch (err) {\n    console.error(err);\n  }\n}\n```',
      video: 'https://www.youtube.com/watch?v=PoRJizFvM7s',
      videoDur: '18:55',
      code: "// Real-world: fetch user data\nasync function getUser(id) {\n  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);\n  if (!response.ok) throw new Error('User not found');\n  return response.json();\n}\n\n// Usage\ngetUser(1).then(user => console.log(user.name));",
      qText: 'What does async/await replace?',
      qOptions: [
        { id: 'a', text: '.then()/.catch() chains', isCorrect: true },
        { id: 'b', text: 'for loops', isCorrect: false },
        { id: 'c', text: 'if/else blocks', isCorrect: false },
        { id: 'd', text: 'variable declarations', isCorrect: false },
      ],
    },
    {
      title: 'Error Handling',
      desc: 'try/catch, custom errors, debugging strategies',
      order: 7,
      dur: 15,
      text: '## Error Handling\n\n### try/catch\n```javascript\ntry {\n  const data = JSON.parse(invalidJSON);\n} catch (error) {\n  console.error("Parse failed:", error.message);\n} finally {\n  console.log("Always runs");\n}\n```\n\n### Custom Errors\n```javascript\nclass ValidationError extends Error {\n  constructor(field, message) {\n    super(message);\n    this.field = field;\n  }\n}\n\nthrow new ValidationError("email", "Invalid format");\n```',
      video: 'https://www.youtube.com/watch?v=cFTFtuEQ-10',
      videoDur: '10:15',
      code: "// Defensive function with validation\nfunction divide(a, b) {\n  if (typeof a !== 'number' || typeof b !== 'number') {\n    throw new TypeError('Arguments must be numbers');\n  }\n  if (b === 0) {\n    throw new RangeError('Cannot divide by zero');\n  }\n  return a / b;\n}\n\ntry {\n  console.log(divide(10, 2));  // 5\n  console.log(divide(10, 0));  // throws!\n} catch (e) {\n  console.error(e.constructor.name + ': ' + e.message);\n}",
      qText: 'When does the finally block run?',
      qOptions: [
        {
          id: 'a',
          text: 'Always, whether error occurred or not',
          isCorrect: true,
        },
        { id: 'b', text: 'Only when there is no error', isCorrect: false },
        { id: 'c', text: 'Only when there is an error', isCorrect: false },
        { id: 'd', text: 'Only in strict mode', isCorrect: false },
      ],
    },
    {
      title: 'ES6+ Features',
      desc: 'Destructuring, spread/rest, template literals, modules, optional chaining',
      order: 8,
      dur: 18,
      text: '## Modern JavaScript (ES6+)\n\n### Template Literals\n```javascript\nconst name = "Alex";\nconsole.log(`Hello, ${name}! You have ${3+2} items.`);\n```\n\n### Spread & Rest\n```javascript\nconst arr = [1, 2, 3];\nconst copy = [...arr, 4, 5]; // [1,2,3,4,5]\n\nfunction sum(...nums) { return nums.reduce((a,b) => a+b, 0); }\n```\n\n### Optional Chaining\n```javascript\nconst city = user?.address?.city ?? "Unknown";\n```\n\n### Modules\n```javascript\nexport const helper = () => {};\nimport { helper } from "./utils.js";\n```',
      video: 'https://www.youtube.com/watch?v=NCwa_xi0Uuc',
      videoDur: '13:40',
      code: "// Combining ES6+ features\nconst users = [\n  { name: 'Alex', age: 25, address: { city: 'Lagos' } },\n  { name: 'Sarah', age: 30, address: null },\n];\n\n// Destructuring + optional chaining + template literals\nconst summaries = users.map(({ name, age, address }) => {\n  const city = address?.city ?? 'Unknown';\n  return `${name} (${age}) from ${city}`;\n});\n\nconsole.log(summaries);\n// ['Alex (25) from Lagos', 'Sarah (30) from Unknown']",
      qText: 'What does ?. (optional chaining) do?',
      qOptions: [
        {
          id: 'a',
          text: 'Returns undefined instead of throwing if property is null/undefined',
          isCorrect: true,
        },
        { id: 'b', text: 'Makes a property required', isCorrect: false },
        { id: 'c', text: 'Converts to boolean', isCorrect: false },
        { id: 'd', text: 'Creates an optional parameter', isCorrect: false },
      ],
    },
  ];

  for (const l of remainingLessons) {
    await prisma.lesson.create({
      data: {
        topicId: courseJS.id,
        title: l.title,
        description: l.desc,
        order: l.order,
        duration: l.dur,
        isPublished: true,
        contentBlocks: {
          create: [
            {
              type: ContentBlockType.TEXT,
              order: 0,
              title: l.title,
              content: l.text,
              questions: {
                create: [
                  {
                    order: 0,
                    difficulty: Difficulty.EASY,
                    text: l.qText,
                    options: l.qOptions as any,
                    explanation:
                      'See the lesson content above for the explanation.',
                    points: 10,
                  },
                ],
              },
            },
            {
              type: ContentBlockType.VIDEO,
              order: 1,
              title: `Watch: ${l.title}`,
              content: l.video,
              overview: `Video lesson covering ${l.desc.toLowerCase()}.`,
              metadata: { duration: l.videoDur, provider: 'youtube' },
            },
            {
              type: ContentBlockType.CODE,
              order: 2,
              title: 'Practice Code',
              content: l.code,
              overview: 'Try running and modifying this code.',
              metadata: { language: 'javascript' },
            },
          ],
        },
        questions: {
          create: [
            {
              order: 0,
              difficulty: Difficulty.MEDIUM,
              text: `Key concept check: ${l.title}`,
              options: [
                {
                  id: 'a',
                  text: 'Correct answer for this topic',
                  isCorrect: true,
                },
                { id: 'b', text: 'Distractor B', isCorrect: false },
                { id: 'c', text: 'Distractor C', isCorrect: false },
                { id: 'd', text: 'Distractor D', isCorrect: false },
              ] as any,
              explanation: `This tests your understanding of ${l.title.toLowerCase()}.`,
              points: 10,
            },
          ],
        },
      },
    });
    console.log(`  ✅ Lesson ${l.order}: ${l.title}`);
  }

  // ====== ENROLLMENTS + PROGRESS ======
  await prisma.topicEnrollment.createMany({
    data: [
      { userId: student.id, topicId: courseJS.id },
      { userId: student.id, topicId: courseReact.id },
    ],
  });
  for (const s of others.slice(0, 6)) {
    await prisma.topicEnrollment
      .create({ data: { userId: s.id, topicId: courseJS.id } })
      .catch(() => {});
  }

  // Student completed lessons 1-3
  const jsLessons = await prisma.lesson.findMany({
    where: { topicId: courseJS.id },
    orderBy: { order: 'asc' },
  });
  for (let i = 0; i < 3; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: jsLessons[i].id,
        completed: true,
        score: [90, 80, 85][i],
        completedAt: new Date(Date.now() - (3 - i) * 86400000),
      },
    });
  }

  // Bookmarks
  await prisma.courseBookmark.createMany({
    data: [
      { userId: student.id, topicId: courseReact.id },
      { userId: student.id, topicId: courseUX.id },
    ],
  });

  // Practice sessions
  await prisma.practiceSession.createMany({
    data: [
      {
        userId: student.id,
        topicId: courseJS.id,
        totalQuestions: 10,
        correctAnswers: 8,
        completedAt: new Date(Date.now() - 86400000),
      },
      {
        userId: student.id,
        topicId: courseJS.id,
        totalQuestions: 10,
        correctAnswers: 6,
        completedAt: new Date(Date.now() - 3 * 86400000),
      },
    ],
  });

  // Assessment config + attempt
  const config = await prisma.assessmentConfig.create({
    data: {
      name: 'Frontend Developer Assessment',
      track: 'frontend',
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
      },
      aiReport:
        '## Overall Assessment\n\nSolid HTML/CSS, needs work on JS and React.\n\n## Strengths\n- HTML: 100%\n- CSS: 67%\n\n## Areas to Improve\n- React: 33%\n- JavaScript: 60%',
    },
  });

  // Badges
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });
  if (profile) {
    await prisma.badge.createMany({
      data: [
        {
          name: 'First Assessment',
          description: 'Completed first assessment',
          imageUrl: null,
          profileId: profile.id,
        },
        {
          name: 'HTML Expert',
          description: 'Scored 75%+ in HTML',
          imageUrl: null,
          profileId: profile.id,
        },
        {
          name: 'Quick Learner',
          description: 'Scored 70%+ overall',
          imageUrl: null,
          profileId: profile.id,
        },
      ],
    });
  }

  console.log(
    '\n✅ Enrollments, progress, bookmarks, practice, assessment, badges',
  );
  console.log('\n🎉 Full seed complete!\n');
  console.log('📋 Credentials:');
  console.log('   Admin:    admin@ets.com / admin123');
  console.log('   Tutor:    sarah.tutor@ets.com / admin123');
  console.log('   Student:  demo@student.com / student123');
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
