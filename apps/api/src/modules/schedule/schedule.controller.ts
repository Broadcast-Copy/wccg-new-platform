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
import { ScheduleService } from './schedule.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * GET /schedule?streamId=...&date=... — Get schedule blocks (public).
   */
  @Public()
  @Get()
  findByStream(
    @Query('streamId') streamId: string,
    @Query('date') date?: string,
  ) {
    return this.scheduleService.findByStream(streamId, date);
  }

  /**
   * GET /schedule/resolve-now?streamId=... — What is live right now (public).
   */
  @Public()
  @Get('resolve-now')
  resolveNow(@Query('streamId') streamId?: string) {
    return this.scheduleService.resolveNow(streamId);
  }

  /**
   * GET /schedule/up-next?streamId=...&limit=... — What's coming up next (public).
   */
  @Public()
  @Get('up-next')
  upNext(
    @Query('streamId') streamId: string,
    @Query('limit') limit?: number,
  ) {
    return this.scheduleService.upNext(streamId, limit);
  }

  /**
   * POST /schedule/blocks — Create a schedule block (admin only).
   */
  @Post('blocks')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createBlock(@Body() dto: Record<string, unknown>) {
    // TODO: Replace with CreateScheduleBlockDto
    return this.scheduleService.createBlock(dto);
  }

  /**
   * PATCH /schedule/blocks/:id — Update a schedule block (admin only).
   */
  @Patch('blocks/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateBlock(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    // TODO: Replace with UpdateScheduleBlockDto
    return this.scheduleService.updateBlock(id, dto);
  }

  /**
   * DELETE /schedule/blocks/:id — Delete a schedule block (admin only).
   */
  @Delete('blocks/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeBlock(@Param('id') id: string) {
    return this.scheduleService.removeBlock(id);
  }
}
