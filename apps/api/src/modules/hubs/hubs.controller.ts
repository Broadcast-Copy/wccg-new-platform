import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { HubsService } from './hubs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('hubs')
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  // ─── Posts ──────────────────────────────────────────────────────

  /**
   * GET /hubs/:type/posts — List posts (public, paginated).
   */
  @Public()
  @Get(':type/posts')
  listPosts(
    @Param('type') hubType: string,
    @Query('page') page?: string,
  ) {
    return this.hubsService.listPosts(hubType as any, page ? parseInt(page, 10) : 1);
  }

  /**
   * POST /hubs/:type/posts — Create a post (authenticated).
   */
  @Post(':type/posts')
  createPost(
    @Param('type') hubType: string,
    @CurrentUser() user: SupabaseUser,
    @Body() body: { content: string; postType: string; mediaUrl?: string; linkUrl?: string },
  ) {
    return this.hubsService.createPost(hubType as any, user.sub, body);
  }

  /**
   * DELETE /hubs/:type/posts/:id — Delete own post (authenticated).
   */
  @Delete(':type/posts/:id')
  deletePost(
    @Param('type') hubType: string,
    @Param('id') postId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.hubsService.deletePost(hubType as any, postId, user.sub);
  }

  // ─── Likes ──────────────────────────────────────────────────────

  /**
   * POST /hubs/:type/posts/:id/like — Like a post (authenticated).
   */
  @Post(':type/posts/:id/like')
  likePost(
    @Param('type') hubType: string,
    @Param('id') postId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.hubsService.likePost(hubType as any, postId, user.sub);
  }

  /**
   * DELETE /hubs/:type/posts/:id/like — Unlike a post (authenticated).
   */
  @Delete(':type/posts/:id/like')
  unlikePost(
    @Param('type') hubType: string,
    @Param('id') postId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.hubsService.unlikePost(hubType as any, postId, user.sub);
  }

  // ─── Membership ─────────────────────────────────────────────────

  /**
   * GET /hubs/:type/membership — Check membership (authenticated).
   */
  @Get(':type/membership')
  checkMembership(
    @Param('type') hubType: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.hubsService.checkMembership(hubType as any, user.sub);
  }

  /**
   * POST /hubs/:type/membership — Join hub (authenticated).
   */
  @Post(':type/membership')
  joinHub(
    @Param('type') hubType: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.hubsService.joinHub(hubType as any, user.sub);
  }

  /**
   * DELETE /hubs/:type/membership — Leave hub (authenticated).
   */
  @Delete(':type/membership')
  leaveHub(
    @Param('type') hubType: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.hubsService.leaveHub(hubType as any, user.sub);
  }

  // ─── Stats ──────────────────────────────────────────────────────

  /**
   * GET /hubs/:type/stats — Hub statistics (public).
   */
  @Public()
  @Get(':type/stats')
  getStats(@Param('type') hubType: string) {
    return this.hubsService.getStats(hubType as any);
  }
}
