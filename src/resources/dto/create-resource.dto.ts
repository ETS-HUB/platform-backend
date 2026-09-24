import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { Difficulty, LearningStyle, ResourceType } from '@prisma/client';

export class CreateResourceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @ApiProperty({ example: 'MDN JavaScript Guide' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
  })
  @IsUrl()
  url: string;

  @ApiProperty({ enum: ResourceType, example: 'DOCUMENTATION' })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({ enum: Difficulty, example: 'EASY' })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ enum: LearningStyle, example: 'VISUAL', required: false })
  @IsEnum(LearningStyle)
  @IsOptional()
  learningStyle?: LearningStyle;

  @ApiProperty({ example: 'Official MDN guide to JavaScript', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
