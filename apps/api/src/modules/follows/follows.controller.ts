import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
} from '@nestjs/common';
import { FollowsService } from './follows.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // ─── Authenticated endpoints ────────────────────────────────────

  /**
   * GET /follows/following — List users I follow (authenticated).
   * IMPORTANT: This route must be defined BEFORE :userId to avoid conflict.
   */
  @Get('following')
  getFollowing(@CurrentUser() user: SupabaseUser) {
    return this.followsService.getFollowing(user.sub);
  }

  /**
   * GET /follows/followers — List my followers (authenticated).
   */
  @Get('followers')
  getFollowers(@CurrentUser() user: SupabaseUser) {
    return this.followsService.getFollowers(user.sub);
  }

  /**
   * POST /follows/:userId — Follow a user (authenticated).
   */
  @Post(':userId')
  follow(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.followsService.follow(user.sub, targetUserId);
  }

  /**
   * DELETE /follows/:userId — Unfollow a user (authenticated).
   */
  @Delete(':userId')
  unfollow(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.followsService.unfollow(user.sub, targetUserId);
  }

  // ─── Public endpoints ───────────────────────────────────────────

  /**
   * GET /follows/:userId/count — Get follower/following counts (public).
   */
  @Public()
  @Get(':userId/count')
  getCounts(@Param('userId') userId: string) {
    return this.followsService.getCounts(userId);
  }
}
