import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StreamsService } from './streams.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  /**
   * GET /streams — List all streams (public).
   */
  @Public()
  @Get()
  findAll() {
    return this.streamsService.findAll();
  }

  /**
   * GET /streams/:id — Get a single stream (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.streamsService.findById(id);
  }

  /**
   * POST /streams — Create a new stream (admin only).
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: Record<string, unknown>) {
    // TODO: Replace with CreateStreamDto
    return this.streamsService.create(dto);
  }

  /**
   * PATCH /streams/:id — Update a stream (admin only).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    // TODO: Replace with UpdateStreamDto
    return this.streamsService.update(id, dto);
  }

  /**
   * DELETE /streams/:id — Delete a stream (admin only).
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.streamsService.remove(id);
  }
}
