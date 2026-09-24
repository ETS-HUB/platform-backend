import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a learning resource (Admin only)' })
  async create(@Body() dto: CreateResourceDto) {
    return this.resourcesService.create(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk upload learning resources (Admin only)' })
  async bulkCreate(@Body('resources') resources: CreateResourceDto[]) {
    return this.resourcesService.bulkCreate(resources);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all resources with filters' })
  @ApiQuery({ name: 'topicId', required: false })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['VIDEO', 'ARTICLE', 'EXERCISE', 'DOCUMENTATION', 'TUTORIAL'],
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ['EASY', 'MEDIUM', 'HARD'],
  })
  @ApiQuery({
    name: 'learningStyle',
    required: false,
    enum: ['VISUAL', 'READING', 'HANDS_ON'],
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        resources: [
          {
            id: 'uuid',
            title: 'MDN JavaScript Reference',
            url: 'https://developer.mozilla.org/...',
            type: 'DOCUMENTATION',
            difficulty: 'MEDIUM',
            learningStyle: null,
            description: 'The complete JS reference',
            topic: { name: 'JavaScript Fundamentals' },
          },
        ],
        pagination: { page: 1, limit: 20, total: 8, totalPages: 1 },
      },
    },
  })
  async findAll(
    @Query('topicId') topicId?: string,
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('learningStyle') learningStyle?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.resourcesService.findAll({
      topicId,
      type,
      difficulty,
      learningStyle,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get personalized resource recommendations for current user',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          title: 'JS Array Methods Cheatsheet',
          url: 'https://javascript.info/array-methods',
          type: 'ARTICLE',
          topic: 'JavaScript Fundamentals',
          difficulty: 'EASY',
        },
      ],
    },
  })
  async getRecommended(@CurrentUser('id') userId: string) {
    return this.resourcesService.getRecommendedForUser(userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a resource (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateResourceDto>,
  ) {
    return this.resourcesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a resource (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
