import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TracksService } from './tracks.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@ApiTags('Tracks')
@Controller('tracks')
export class TracksController {
  constructor(private tracksService: TracksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all active tracks (public — used by onboarding, filters)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'uuid',
          slug: 'frontend',
          name: 'Frontend Developer',
          description:
            'Build user interfaces with HTML, CSS, JavaScript, and React',
          icon: '🖥️',
          isActive: true,
        },
      ],
    },
  })
  async findAll() {
    return this.tracksService.findAll();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tracks including inactive (Admin)' })
  async findAllAdmin() {
    return this.tracksService.findAll(true);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new track (Admin)' })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 'uuid',
        slug: 'mobile',
        name: 'Mobile Developer',
        description: 'Build iOS and Android apps',
        icon: '📱',
        isActive: true,
      },
    },
  })
  async create(
    @Body()
    data: {
      slug: string;
      name: string;
      description?: string;
      imageUrl?: string;
    },
  ) {
    return this.tracksService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a track (Admin)' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.tracksService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a track (Admin)' })
  async delete(@Param('id') id: string) {
    return this.tracksService.delete(id);
  }
}
