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
import { Difficulty } from '@prisma/client';

class OptionDto {
  @ApiProperty({ example: 'a' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Hyper Text Markup Language' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @ApiProperty({ enum: Difficulty, example: 'MEDIUM' })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ example: 'What does HTML stand for?' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    type: [OptionDto],
    example: [
      { id: 'a', text: 'Hyper Text Markup Language', isCorrect: true },
      { id: 'b', text: 'High Tech Modern Language', isCorrect: false },
      { id: 'c', text: 'Hyper Transfer Markup Language', isCorrect: false },
      { id: 'd', text: 'Home Tool Markup Language', isCorrect: false },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];

  @ApiProperty({
    example: 'HTML stands for HyperText Markup Language.',
    required: false,
  })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  points?: number;

  @ApiProperty({
    example: 30,
    required: false,
    description: 'Time limit in seconds',
  })
  @IsInt()
  @Min(5)
  @IsOptional()
  timeLimit?: number;
}
