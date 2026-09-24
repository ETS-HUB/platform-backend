import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Difficulty } from '@prisma/client';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Custom validator: distribution values must sum to totalQuestions
function DistributionSumsToTotal(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'distributionSumsToTotal',
      target: (object as any).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true;
          const total = (args.object as any).totalQuestions;
          const sum = Object.values(value as Record<string, number>).reduce(
            (acc: number, n) => acc + (n as number),
            0,
          );
          return sum === total;
        },
        defaultMessage(args: ValidationArguments) {
          const total = (args.object as any).totalQuestions;
          const value = (args.object as any)[args.property];
          const sum = value
            ? Object.values(value as Record<string, number>).reduce(
                (acc: number, n) => acc + (n as number),
                0,
              )
            : 0;
          return `${args.property} values sum to ${sum} but totalQuestions is ${total}. They must be equal.`;
        },
      },
    });
  };
}

export class CreateAssessmentConfigDto {
  @ApiProperty({ example: 'Frontend Developer Assessment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Assessment for frontend developer track',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'frontend',
    required: false,
    description:
      'Track: frontend, backend, cybersecurity, data-science, ui-ux, devops, product-management',
  })
  @IsString()
  @IsOptional()
  track?: string;

  @ApiProperty({
    enum: Difficulty,
    example: 'MEDIUM',
    required: false,
    description: 'Overall difficulty (null = mixed)',
  })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(5)
  totalQuestions: number;

  @ApiProperty({ example: 25, description: 'Time limit in minutes' })
  @IsInt()
  @Min(5)
  timeLimitMinutes: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isBoothMode?: boolean;

  @ApiProperty({
    example: {
      'topic-id-html': 4,
      'topic-id-css': 4,
      'topic-id-js': 5,
      'topic-id-react': 4,
    },
    required: false,
    description:
      'Map of topicId → number of questions. Mutually exclusive with difficultyDistribution. Values must sum to totalQuestions.',
  })
  @IsObject()
  @IsOptional()
  @ValidateIf((o) => !o.difficultyDistribution || o.topicDistribution)
  @DistributionSumsToTotal({
    message: 'topicDistribution values must sum to totalQuestions',
  })
  topicDistribution?: Record<string, number>;

  @ApiProperty({
    example: { EASY: 5, MEDIUM: 10, HARD: 5 },
    required: false,
    description:
      'Map of difficulty → number of questions. Mutually exclusive with topicDistribution. Values must sum to totalQuestions.',
  })
  @IsObject()
  @IsOptional()
  @ValidateIf((o) => !o.topicDistribution || o.difficultyDistribution)
  @DistributionSumsToTotal({
    message: 'difficultyDistribution values must sum to totalQuestions',
  })
  difficultyDistribution?: Record<string, number>;
}
