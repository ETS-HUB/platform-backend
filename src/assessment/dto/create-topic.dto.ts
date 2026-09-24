import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({ example: 'JavaScript' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'JavaScript programming fundamentals',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'https://cdn.example.com/topics/javascript.png',
    required: false,
    description: 'Uploaded image URL (frontend uploads first, passes URL here)',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: 'clx3c4d5e6f7g8h9i0j1k2l3m',
    required: false,
    description: 'Parent category ID — omit to create a top-level category',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    example: ['clx2b3c4d5e6f7g8h9i0j1k2l', 'clx3c4d5e6f7g8h9i0j1k2l3m'],
    required: false,
    description: 'Tutor user IDs to assign to this course on creation',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tutorIds?: string[];
}
