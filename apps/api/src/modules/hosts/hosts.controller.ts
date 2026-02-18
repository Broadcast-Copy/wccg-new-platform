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
import { HostsService } from './hosts.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('hosts')
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  /**
   * GET /hosts — List all hosts (public).
   */
  @Public()
  @Get()
  findAll() {
    return this.hostsService.findAll();
  }

  /**
   * GET /hosts/:id — Get a single host (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hostsService.findById(id);
  }

  /**
   * POST /hosts — Create a new host (admin only).
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: Record<string, unknown>) {
    // TODO: Replace with CreateHostDto
    return this.hostsService.create(dto);
  }

  /**
   * PATCH /hosts/:id — Update a host (admin only).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    // TODO: Replace with UpdateHostDto
    return this.hostsService.update(id, dto);
  }

  /**
   * DELETE /hosts/:id — Delete a host (admin only).
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.hostsService.remove(id);
  }
}
