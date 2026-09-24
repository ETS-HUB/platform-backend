import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ExperienceLevel, LearningStyle } from '@prisma/client';

export class CreateProfileDto {
  @ApiProperty({ example: 'Frontend Developer' })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({
    example: 'frontend',
    description: 'Track slug from GET /api/tracks',
  })
  @IsString()
  @IsOptional()
  trackSlug?: string;

  @ApiProperty({ enum: ExperienceLevel, example: 'BEGINNER' })
  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @ApiProperty({ enum: LearningStyle, example: 'VISUAL' })
  @IsEnum(LearningStyle)
  learningStyle: LearningStyle;

  @ApiProperty({ example: 15, minimum: 1, maximum: 60 })
  @IsInt()
  @Min(1)
  @Max(60)
  weeklyHours: number;
}
