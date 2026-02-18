import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShowsService } from './shows.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  /**
   * GET /shows — List all shows (public, filterable).
   */
  @Public()
  @Get()
  findAll(
    @Query('genre') genre?: string,
    @Query('hostId') hostId?: string,
    @Query('streamId') streamId?: string,
  ) {
    return this.showsService.findAll({ genre, hostId, streamId });
  }

  /**
   * GET /shows/:id — Get a single show (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showsService.findById(id);
  }

  /**
   * POST /shows — Create a new show (admin only).
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: Record<string, unknown>) {
    // TODO: Replace with CreateShowDto
    return this.showsService.create(dto);
  }

  /**
   * PATCH /shows/:id — Update a show (admin only).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    // TODO: Replace with UpdateShowDto
    return this.showsService.update(id, dto);
  }

  /**
   * DELETE /shows/:id — Delete a show (admin only).
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.showsService.remove(id);
  }
}
