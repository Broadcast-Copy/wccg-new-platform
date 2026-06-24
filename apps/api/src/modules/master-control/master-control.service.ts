import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { STATION_ID } from '../../common/supabase/station.js';

interface MetadataUpdate {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  artUrl?: string | null;
  source?: string | null;
  startedAt?: string | null;
  listeners?: number | null;
  bitrateKbps?: number | null;
  signalStatus?: 'on_air' | 'silent' | 'off_air' | 'unknown' | null;
}

interface EasInsertDto {
  direction: 'received' | 'originated' | 'test';
  sameCode?: string;
  eventLabel: string;
  severity?: 'minor' | 'moderate' | 'severe' | 'extreme' | 'test';
  originator?: string;
  fipsCodes?: string[];
  issuedAt?: string;
  receivedAt?: string;
  sentAt?: string;
  expiresAt?: string;
  airedForSeconds?: number;
  messageText?: string;
  audioUrl?: string;
  rawSameBurst?: string;
  source?: string;
  testScheduleId?: string;
  notes?: string;
}

@Injectable()
export class MasterControlService {
  private readonly logger = new Logger(MasterControlService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── MCR dashboard ─────────────────────────────────────────────────────

  /**
   * One-shot dashboard payload — what's on air, recent EAS, missing-this-week
   * counts, pool pending, etc. Cheap enough to call every 10s from the UI.
   */
  async dashboard() {
    const [
      { data: mcr },
      { data: recentEas },
      { data: nextTests },
      { data: missing },
      alerts,
    ] = await Promise.all([
      this.db.from('mcr_dashboard').select('*').limit(1).maybeSingle(),
      this.db.from('eas_alerts')
        .select('id, direction, same_code, event_label, severity, originator, issued_at, sent_at')
        .order('issued_at', { ascending: false })
        .limit(8),
      this.db.from('eas_test_schedule')
        .select('id, kind, scheduled_for, completed_at, notes')
        .is('completed_at', null)
        .order('scheduled_for', { ascending: true })
        .limit(5),
      this.db.from('dj_drops_this_week').select('*'),
      this.alerts(),
    ]);

    const missingThisWeek = (missing ?? []).filter(
      (r: any) => r.drop_status === 'pending',
    ).length;

    return {
      state: mcr ?? null,
      recentEas: recentEas ?? [],
      nextTests: nextTests ?? [],
      missingThisWeek,
      alerts: alerts ?? [],
    };
  }

  /** Public, no-auth: minimal payload powering /on-air. */
  async publicOnAir() {
    const { data: mcr } = await this.db.from('mcr_state')
      .select('now_playing_title, now_playing_artist, now_playing_album, now_playing_art_url, now_playing_source, now_playing_started_at, current_show_title, current_dj_slug, signal_status, listeners, last_metadata_at, updated_at')
      .eq('id', 1)
      .maybeSingle();

    return {
      nowPlaying: mcr
        ? {
            title: mcr.now_playing_title,
            artist: mcr.now_playing_artist,
            album: mcr.now_playing_album,
            artUrl: mcr.now_playing_art_url,
            source: mcr.now_playing_source,
            startedAt: mcr.now_playing_started_at,
          }
        : null,
      currentShow: mcr
        ? { title: mcr.current_show_title, djSlug: mcr.current_dj_slug }
        : null,
      signalStatus: mcr?.signal_status ?? 'unknown',
      listeners: mcr?.listeners ?? null,
      lastMetadataAt: mcr?.last_metadata_at ?? null,
      updatedAt: mcr?.updated_at ?? null,
    };
  }

  /**
   * Update the MCR singleton's now-playing metadata. Called by the
   * metadata-poll worker AND by manual operator overrides via the MCR UI.
   */
  async updateMetadata(dto: MetadataUpdate) {
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.title !== undefined)        patch.now_playing_title      = dto.title;
    if (dto.artist !== undefined)       patch.now_playing_artist     = dto.artist;
    if (dto.album !== undefined)        patch.now_playing_album      = dto.album;
    if (dto.artUrl !== undefined)       patch.now_playing_art_url    = dto.artUrl;
    if (dto.source !== undefined)       patch.now_playing_source     = dto.source;
    if (dto.startedAt !== undefined)    patch.now_playing_started_at = dto.startedAt;
    if (dto.listeners !== undefined)    patch.listeners              = dto.listeners;
    if (dto.bitrateKbps !== undefined)  patch.bitrate_kbps           = dto.bitrateKbps;
    if (dto.signalStatus !== undefined) patch.signal_status          = dto.signalStatus;
    patch.last_metadata_at = new Date().toISOString();

    const { error } = await this.db.from('mcr_state').update(patch).eq('id', 1);
    if (error) throw new BadRequestException(error.message);

    // Mirror to song_history (FCC playlist log) when title+artist present.
    if (dto.title && dto.artist) {
      await this.db.from('song_history').insert({
        station_id: STATION_ID,
        title: dto.title,
        artist: dto.artist,
        album: dto.album ?? null,
        played_at: dto.startedAt ?? new Date().toISOString(),
        source: dto.source ?? 'icecast',
      } as any).then(() => null, (e: any) => this.logger.warn(`song_history insert failed: ${e?.message ?? e}`));
    }

    return { ok: true };
  }

  /** Operator-only sticky note that appears at the top of the MCR dashboard. */
  async updateOperatorNote(note: string | null) {
    const { error } = await this.db.from('mcr_state')
      .update({ operator_note: note, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  /** Update which DJ + show is on air right now. */
  async assignCurrentDj(djSlug: string | null, showTitle: string | null) {
    let djId: string | null = null;
    if (djSlug) {
      const { data: dj } = await this.db.from('djs')
        .select('id, slug')
        .eq('slug', djSlug)
        .maybeSingle();
      if (!dj) throw new NotFoundException(`DJ ${djSlug} not found`);
      djId = dj.id;
    }
    const { error } = await this.db.from('mcr_state')
      .update({
        current_dj_id: djId,
        current_dj_slug: djSlug,
        current_show_title: showTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ─── EAS logbook ───────────────────────────────────────────────────────

  async easList(params: { from?: string; to?: string; direction?: string; limit?: number }) {
    let q = this.db.from('eas_alerts').select('*');
    if (params.from)      q = q.gte('issued_at', params.from);
    if (params.to)        q = q.lte('issued_at', params.to);
    if (params.direction) q = q.eq('direction', params.direction);
    const { data, error } = await q
      .order('issued_at', { ascending: false })
      .limit(Math.min(Math.max(params.limit ?? 100, 1), 1000));
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async logEas(userId: string, dto: EasInsertDto) {
    if (!dto.eventLabel || !dto.direction) {
      throw new BadRequestException('eventLabel + direction required');
    }
    const { data, error } = await this.db.from('eas_alerts')
      .insert({
        station_id:        STATION_ID,
        direction:         dto.direction,
        same_code:         dto.sameCode ?? null,
        event_label:       dto.eventLabel,
        severity:          dto.severity ?? 'minor',
        originator:        dto.originator ?? null,
        fips_codes:        dto.fipsCodes ?? [],
        issued_at:         dto.issuedAt ?? new Date().toISOString(),
        received_at:       dto.receivedAt ?? null,
        sent_at:           dto.sentAt ?? null,
        expires_at:        dto.expiresAt ?? null,
        aired_for_seconds: dto.airedForSeconds ?? null,
        message_text:      dto.messageText ?? null,
        audio_url:         dto.audioUrl ?? null,
        raw_same_burst:    dto.rawSameBurst ?? null,
        source:            dto.source ?? 'manual',
        test_schedule_id:  dto.testScheduleId ?? null,
        logged_by_user_id: userId,
        notes:             dto.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    // Bump mcr_state.last_eas_at for the dashboard light.
    await this.db.from('mcr_state')
      .update({ last_eas_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', 1);

    // If this came from a scheduled test, close it.
    if (dto.testScheduleId) {
      await this.db.from('eas_test_schedule')
        .update({
          completed_at: new Date().toISOString(),
          alert_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dto.testScheduleId);
    }

    return { ok: true, alert: data };
  }

  // ─── Test schedule ─────────────────────────────────────────────────────

  async listTests(includeCompleted: boolean) {
    let q = this.db.from('eas_test_schedule')
      .select('*, alert:eas_alerts(id, issued_at, sent_at, severity)');
    if (!includeCompleted) q = q.is('completed_at', null);
    const { data } = await q.order('scheduled_for', { ascending: true });
    return data ?? [];
  }

  // ─── Service-health alerts ─────────────────────────────────────────────

  /**
   * Compute live alerts for the MCR banner. Cheap — runs a handful of
   * scalar queries. Returns deterministically ordered, severity-tagged
   * items. The dashboard auto-refreshes this every 10s along with the
   * rest of the dashboard payload.
   */
  async alerts() {
    const out: Array<{
      id: string;
      severity: 'info' | 'warn' | 'error';
      kind: 'metadata_stale' | 'restream_failed' | 'studio_silent' | 'eas_overdue' | 'restream_no_destinations';
      title: string;
      detail: string;
      link?: string;
    }> = [];

    // ── Metadata staleness ─────────────────────────────────────────────
    const { data: state } = await this.db.from('mcr_state')
      .select('last_metadata_at, signal_status, now_playing_source')
      .eq('id', 1).maybeSingle();
    if (state?.last_metadata_at) {
      const ageMs = Date.now() - new Date(state.last_metadata_at).getTime();
      if (ageMs > 5 * 60 * 1000 && state.signal_status !== 'unknown') {
        out.push({
          id: 'metadata_stale',
          severity: 'warn',
          kind: 'metadata_stale',
          title: 'Metadata is stale',
          detail: `Last update ${Math.round(ageMs / 60000)}m ago. Set source manually or restart the metadata-poll worker.`,
          link: '/my/admin/master-control',
        });
      }
    }

    // ── Restream destinations failed ──────────────────────────────────
    const { data: failed } = await this.db.from('restream_destinations')
      .select('id, label, status, consecutive_failures, last_error_msg')
      .eq('enabled', true)
      .in('status', ['failed', 'reconnecting']);
    for (const d of failed ?? []) {
      if ((d.consecutive_failures ?? 0) >= 3) {
        out.push({
          id: `restream_failed_${d.id}`,
          severity: 'error',
          kind: 'restream_failed',
          title: `${d.label} is ${d.status}`,
          detail: `${d.consecutive_failures} consecutive failures. ${d.last_error_msg ?? ''}`.trim(),
          link: '/my/admin/restream',
        });
      }
    }

    // ── Studio-sync agent silent ──────────────────────────────────────
    // If there are uploaded drops that haven't transitioned to 'published'
    // in the last 30 minutes, the studio-sync agent might be down.
    const { data: pending } = await this.db.from('dj_drops')
      .select('id, file_code, uploaded_at, status', { count: 'exact' } as any)
      .eq('status', 'uploaded')
      .lte('uploaded_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(1);
    if (pending && pending.length > 0) {
      out.push({
        id: 'studio_silent',
        severity: 'warn',
        kind: 'studio_silent',
        title: 'Studio-sync agent may be offline',
        detail: 'Drops uploaded > 30m ago are still in "uploaded" state — the studio PC hasn\'t pulled them yet.',
        link: '/my/admin/dj-drops',
      });
    }

    // ── EAS test overdue ─────────────────────────────────────────────
    const { data: overdue } = await this.db.from('eas_test_schedule')
      .select('id, kind, scheduled_for')
      .is('completed_at', null)
      .lt('scheduled_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(3);
    for (const t of overdue ?? []) {
      out.push({
        id: `eas_overdue_${t.id}`,
        severity: 'error',
        kind: 'eas_overdue',
        title: `${t.kind} overdue`,
        detail: `Scheduled ${new Date(t.scheduled_for).toLocaleDateString()}. FCC requires weekly RWT compliance.`,
        link: '/my/admin/eas',
      });
    }

    // ── No restream destinations configured (info-level nudge) ────────
    const { count: restreamCount } = await this.db.from('restream_destinations')
      .select('id', { count: 'exact', head: true } as any);
    if ((restreamCount ?? 0) === 0) {
      out.push({
        id: 'restream_no_destinations',
        severity: 'info',
        kind: 'restream_no_destinations',
        title: 'No restream destinations configured',
        detail: 'Phase D ready — add a YouTube/Twitch destination at /my/admin/restream when you\'re ready to simulcast.',
        link: '/my/admin/restream',
      });
    }

    return out;
  }

  async completeTest(userId: string, testId: string, kind: 'RWT' | 'RMT', notes?: string) {
    const { data: test } = await this.db.from('eas_test_schedule')
      .select('*')
      .eq('id', testId)
      .maybeSingle();
    if (!test) throw new NotFoundException();
    if (test.completed_at) {
      throw new BadRequestException(`Test ${testId} already completed`);
    }

    // Insert the alert + close the schedule row.
    const { alert } = await this.logEas(userId, {
      direction: 'test',
      sameCode: kind,
      eventLabel: kind === 'RWT' ? 'Required Weekly Test' : 'Required Monthly Test',
      severity: 'test',
      originator: 'WCCG',
      sentAt: new Date().toISOString(),
      source: 'test_schedule',
      testScheduleId: testId,
      notes,
    });

    return { ok: true, alert };
  }
}
