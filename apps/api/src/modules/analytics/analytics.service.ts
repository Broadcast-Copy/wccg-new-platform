import { Injectable } from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: SupabaseDbService) {}

  /** Top-of-page counters: 14 scalars in one view query. */
  async overview() {
    const { data } = await this.db.from('analytics_overview')
      .select('*').limit(1).maybeSingle();
    return data ?? {};
  }

  /** Daily engagement events for the last N days (default 30). */
  async engagementDaily(days = 30) {
    const limit = Math.min(Math.max(days, 1), 90);
    const { data } = await this.db.from('analytics_engagement_daily')
      .select('*')
      .limit(limit);
    return data ?? [];
  }

  /** Breakdown of engagement events by reason (LISTENING / DAILY_BOUNTY / etc.) */
  async engagementByReason() {
    const { data } = await this.db.from('analytics_engagement_by_reason')
      .select('*');
    return data ?? [];
  }

  async signupsWeekly() {
    const { data } = await this.db.from('analytics_signups_weekly')
      .select('*');
    return data ?? [];
  }

  /** DJ portal activity: drops per DJ per week. */
  async djActivityWeekly() {
    const { data } = await this.db.from('analytics_dj_activity_weekly')
      .select('*');
    return data ?? [];
  }

  /** Record-pool uploads + downloads per week. */
  async poolActivityWeekly() {
    const { data } = await this.db.from('analytics_pool_activity_weekly')
      .select('*');
    return data ?? [];
  }

  /** Top 20 record-pool tracks by all-time download count. */
  async poolTopTracks(limit = 20) {
    const { data } = await this.db.from('analytics_pool_top_tracks')
      .select('*')
      .limit(Math.min(Math.max(limit, 1), 100));
    return data ?? [];
  }

  /**
   * Weekly digest — a single payload that summarizes the prior week.
   * Designed for an email send (Resend/Postmark) or operator review.
   *
   *   weekOf  — ISO Monday string; defaults to last Monday in ET.
   */
  async weeklyDigest(weekOf?: string) {
    const monday = weekOf
      ? new Date(weekOf + 'T00:00:00Z')
      : (() => {
          const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const d = now.getDay(); // 0=Sun
          const offset = (d + 6) % 7;
          const m = new Date(now); m.setDate(now.getDate() - offset - 7);
          m.setHours(0, 0, 0, 0);
          return m;
        })();
    const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);

    const weekStr = monday.toISOString().slice(0, 10);
    const [
      { data: events },
      { data: signupRow },
      { data: drops },
      { data: poolUploads },
      { data: poolDownloads },
      { data: easEvents },
    ] = await Promise.all([
      this.db.from('points_history')
        .select('reason, amount, user_id, created_at')
        .gte('created_at', monday.toISOString())
        .lt('created_at', nextMonday.toISOString()),
      this.db.from('analytics_signups_weekly')
        .select('signups')
        .eq('week', weekStr)
        .maybeSingle(),
      this.db.from('dj_drops')
        .select('dj_id, status, uploaded_at, file_code')
        .gte('uploaded_at', monday.toISOString())
        .lt('uploaded_at', nextMonday.toISOString()),
      this.db.from('record_pool_tracks')
        .select('id, title, artist, status, created_at')
        .gte('created_at', monday.toISOString())
        .lt('created_at', nextMonday.toISOString()),
      this.db.from('record_pool_downloads')
        .select('track_id, user_id, created_at')
        .gte('created_at', monday.toISOString())
        .lt('created_at', nextMonday.toISOString()),
      this.db.from('eas_alerts')
        .select('direction, severity, same_code, issued_at')
        .gte('issued_at', monday.toISOString())
        .lt('issued_at', nextMonday.toISOString()),
    ]);

    const eventsByReason: Record<string, { events: number; points: number }> = {};
    for (const e of events ?? []) {
      const k = (e as any).reason;
      const cur = eventsByReason[k] || { events: 0, points: 0 };
      cur.events += 1;
      cur.points += (e as any).amount || 0;
      eventsByReason[k] = cur;
    }

    return {
      weekOf: monday.toISOString().slice(0, 10),
      nextWeekOf: nextMonday.toISOString().slice(0, 10),
      engagement: {
        totalEvents: events?.length ?? 0,
        activeUsers: new Set((events ?? []).map((e: any) => e.user_id)).size,
        byReason: eventsByReason,
      },
      signups: signupRow?.signups ?? 0,
      djPortal: {
        dropsUploaded: drops?.length ?? 0,
        uniqueDjs: new Set((drops ?? []).map((d: any) => d.dj_id)).size,
        uniqueCodes: new Set((drops ?? []).map((d: any) => d.file_code)).size,
      },
      recordPool: {
        uploads: poolUploads?.length ?? 0,
        approved: (poolUploads ?? []).filter((p: any) => p.status === 'approved').length,
        downloads: poolDownloads?.length ?? 0,
      },
      eas: {
        events: easEvents?.length ?? 0,
        received: (easEvents ?? []).filter((e: any) => e.direction === 'received').length,
        originated: (easEvents ?? []).filter((e: any) => e.direction === 'originated').length,
        tests: (easEvents ?? []).filter((e: any) => e.direction === 'test').length,
      },
    };
  }
}
