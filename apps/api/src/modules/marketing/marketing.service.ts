import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { PointsService } from '../points/points.service.js';

/**
 * Newsletter signup. Phase A8.
 *
 * Resend integration is wrapped in a try/catch — if RESEND_API_KEY is unset,
 * the row is still persisted (status='pending') and a no-op log is emitted so
 * dev environments don't 500. In prod, set RESEND_API_KEY and the email goes
 * out with a magic confirmation link.
 */
@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly db: SupabaseDbService,
    private readonly config: ConfigService,
    private readonly points: PointsService,
  ) {}

  async subscribeNewsletter(emailRaw: string, source?: string) {
    const email = (emailRaw ?? '').trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) {
      throw new BadRequestException('Valid email required');
    }

    const token = randomBytes(24).toString('hex');

    // Upsert by unique email — re-subscribing reuses the row, regenerates token.
    const { data: row, error } = await this.db.from('newsletter_subscribers')
      .upsert(
        {
          email,
          source: source ?? null,
          status: 'pending',
          confirmation_token: token,
        },
        { onConflict: 'email' } as any,
      )
      .select()
      .single();

    if (error) throw error;

    await this.sendConfirmationEmail(email, token);

    return { ok: true, email, status: row.status };
  }

  async confirmNewsletter(token: string) {
    if (!token) throw new BadRequestException('token required');

    const { data: row } = await this.db.from('newsletter_subscribers')
      .select('*')
      .eq('confirmation_token', token)
      .maybeSingle();

    if (!row) throw new NotFoundException('Invalid or expired confirmation token');

    if (row.status === 'confirmed') {
      return { ok: true, alreadyConfirmed: true };
    }

    const { error: upErr } = await this.db.from('newsletter_subscribers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmation_token: null,
      })
      .eq('id', row.id);
    if (upErr) throw upErr;

    // Award +100 WP if the email is linked to a user account.
    if (row.user_id) {
      await this.points.award(row.user_id, {
        amount: 100,
        reason: 'NEWSLETTER',
        idempotencyKey: `newsletter:${row.email}`,
      });
    }

    return { ok: true, alreadyConfirmed: false };
  }

  private async sendConfirmationEmail(email: string, token: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const fromAddr = this.config.get<string>('RESEND_FROM') ?? 'WCCG <hello@wccg1045fm.com>';
    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? 'https://app.wccg1045fm.com';
    const confirmUrl = `${baseUrl}/api/v1/marketing/newsletter/confirm?token=${token}`;

    if (!apiKey) {
      this.logger.warn(
        `[NEWSLETTER] RESEND_API_KEY not set — skipping send. Confirm URL for ${email}: ${confirmUrl}`,
      );
      return;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: email,
          subject: 'Confirm your WCCG newsletter subscription',
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #111;">
              <h1 style="font-size: 22px; margin: 0 0 12px;">Welcome to WCCG 104.5 FM</h1>
              <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
                Tap the button to confirm your subscription. You'll get contest alerts, event invites, and new-show announcements — and we'll drop <strong>100 WP</strong> in your wallet.
              </p>
              <p style="margin: 24px 0;">
                <a href="${confirmUrl}" style="background:#dc2626; color:#fff; padding:12px 18px; border-radius:9999px; text-decoration:none; font-weight:700;">Confirm subscription</a>
              </p>
              <p style="font-size: 12px; color: #666;">
                Didn't sign up? Ignore this email — no further messages will be sent.
              </p>
            </div>
          `,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Resend returned ${res.status} for ${email}`);
      }
    } catch (e) {
      this.logger.warn(`Resend send failed for ${email}: ${(e as Error).message}`);
    }
  }
}
