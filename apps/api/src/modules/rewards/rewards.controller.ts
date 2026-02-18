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
import { RewardsService } from './rewards.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * GET /rewards — List all rewards (public catalog).
   */
  @Public()
  @Get()
  findAll() {
    return this.rewardsService.findAll({ active: true });
  }

  /**
   * GET /rewards/:id — Get a single reward (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rewardsService.findById(id);
  }

  /**
   * POST /rewards — Create a new reward (admin only).
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: Record<string, unknown>) {
    // TODO: Replace with CreateRewardDto
    return this.rewardsService.create(dto);
  }

  /**
   * PATCH /rewards/:id — Update a reward (admin only).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    // TODO: Replace with UpdateRewardDto
    return this.rewardsService.update(id, dto);
  }

  /**
   * DELETE /rewards/:id — Delete a reward (admin only).
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.rewardsService.remove(id);
  }
}
