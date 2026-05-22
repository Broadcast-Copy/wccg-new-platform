import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Station analytics — operator-only read endpoints over the
 * analytics_* views. Cheap: each is a single SELECT * from a view.
 *
 *   GET /analytics/overview
 *   GET /analytics/engagement/daily?days=30
 *   GET /analytics/engagement/by-reason
 *   GET /analytics/signups/weekly
 *   GET /analytics/djs/activity
 *   GET /analytics/pool/activity
 *   GET /analytics/pool/top-tracks?limit=20
 *   GET /analytics/digest?week=YYYY-MM-DD
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Roles('admin')
  @Get('overview')
  overview() {
    return this.svc.overview();
  }

  @Roles('admin')
  @Get('engagement/daily')
  engagementDaily(@Query('days') days?: string) {
    return this.svc.engagementDaily(Number(days) || 30);
  }

  @Roles('admin')
  @Get('engagement/by-reason')
  engagementByReason() {
    return this.svc.engagementByReason();
  }

  @Roles('admin')
  @Get('signups/weekly')
  signupsWeekly() {
    return this.svc.signupsWeekly();
  }

  @Roles('admin')
  @Get('djs/activity')
  djActivity() {
    return this.svc.djActivityWeekly();
  }

  @Roles('admin')
  @Get('pool/activity')
  poolActivity() {
    return this.svc.poolActivityWeekly();
  }

  @Roles('admin')
  @Get('pool/top-tracks')
  poolTopTracks(@Query('limit') limit?: string) {
    return this.svc.poolTopTracks(Number(limit) || 20);
  }

  @Roles('admin')
  @Get('digest')
  digest(@Query('week') week?: string) {
    return this.svc.weeklyDigest(week);
  }
}
