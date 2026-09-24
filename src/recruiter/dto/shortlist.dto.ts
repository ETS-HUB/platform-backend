import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddToShortlistDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    example: 'Strong JavaScript candidate, good for frontend role',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateShortlistNotesDto {
  @ApiProperty({
    example: 'Interviewed — strong communication, schedule follow-up',
  })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
