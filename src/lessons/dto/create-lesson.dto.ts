import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentBlockType, Difficulty } from '@prisma/client';

class ContentBlockDto {
  @ApiProperty({ enum: ContentBlockType, example: 'TEXT' })
  @IsEnum(ContentBlockType)
  type: ContentBlockType;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    example:
      '## Variables in JavaScript\n\nA variable is a container for storing data...',
    description:
      'Markdown text, video URL, code snippet, image URL, or resource link',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'Introduction to Variables', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: { language: 'javascript', duration: '5:30' },
    required: false,
    description:
      'Extra metadata: language for CODE blocks, duration for VIDEO blocks',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

class LessonQuestionDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ enum: Difficulty, example: 'EASY' })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({
    example: 'What keyword declares a variable that cannot be reassigned?',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: [
      { id: 'a', text: 'var', isCorrect: false },
      { id: 'b', text: 'let', isCorrect: false },
      { id: 'c', text: 'const', isCorrect: true },
      { id: 'd', text: 'final', isCorrect: false },
    ],
  })
  @IsArray()
  options: any[];

  @ApiProperty({
    example: 'const declares a block-scoped constant.',
    required: false,
  })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @IsOptional()
  points?: number;
}

export class CreateLessonDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @ApiProperty({ example: 'Variables & Data Types' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Learn about variables, constants, and data types in JavaScript',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Estimated minutes to complete',
  })
  @IsInt()
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({
    type: [ContentBlockDto],
    required: false,
    description: 'Content blocks (text, video, code, images, links) in order',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  @IsOptional()
  contentBlocks?: ContentBlockDto[];

  @ApiProperty({
    type: [LessonQuestionDto],
    required: false,
    description: 'Follow-up questions for this lesson',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonQuestionDto)
  @IsOptional()
  questions?: LessonQuestionDto[];
}
