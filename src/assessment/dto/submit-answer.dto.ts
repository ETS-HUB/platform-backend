import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ example: 'a' })
  @IsString()
  @IsNotEmpty()
  selectedOption: string;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Time taken in seconds',
  })
  @IsInt()
  @IsOptional()
  timeTaken?: number;
}
