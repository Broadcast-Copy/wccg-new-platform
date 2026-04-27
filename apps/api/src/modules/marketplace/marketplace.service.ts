import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { PointsService } from '../points/points.service.js';

interface CheckoutDto {
  items: Array<{ productSlug: string; variantId?: string; qty: number }>;
  paymentMode: 'cash' | 'points' | 'split';
  fulfillment?: 'digital' | 'pickup' | 'ship' | 'redeem_at_place';
  redeemPlaceSlug?: string;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly db: SupabaseDbService,
    private readonly config: ConfigService,
    private readonly points: PointsService,
  ) {}

  // ─── Catalog ────────────────────────────────────────────────────────────

  async listProducts(opts: { kind?: string; search?: string; limit?: number }) {
    let q = this.db.from('products')
      .select('id, slug, title, description, kind, cover_url, cash_price_cents, points_price, stock, status')
      .eq('status', 'active');
    if (opts.kind) q = q.eq('kind', opts.kind);
    if (opts.search) q = q.ilike('title', `%${opts.search}%`);
    const limit = Math.min(200, Math.max(1, Number(opts.limit) || 60));
    const { data, error } = await q.limit(limit);
    if (error) throw error;
    return (data ?? []).map(this.mapProduct);
  }

  async getProduct(slug: string) {
    const { data: prod, error } = await this.db.from('products')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!prod) throw new NotFoundException('Product not found');
    const { data: variants } = await this.db.from('product_variants')
      .select('*')
      .eq('product_id', prod.id);
    return {
      ...this.mapProduct(prod),
      description: prod.description ?? null,
      metadata: prod.metadata ?? null,
      variants: (variants ?? []).map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        cashPriceCents: v.cash_price_cents,
        pointsPrice: v.points_price,
        stock: v.stock,
      })),
    };
  }

  // ─── Checkout ───────────────────────────────────────────────────────────

  async checkout(userId: string, dto: CheckoutDto) {
    if (!Array.isArray(dto?.items) || dto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    if (!['cash', 'points', 'split'].includes(dto.paymentMode)) {
      throw new BadRequestException('Invalid paymentMode');
    }

    // Resolve and price each item.
    let totalCash = 0;
    let totalPoints = 0;
    const resolved: Array<{
      product: any;
      variant: any | null;
      qty: number;
      cashCents: number;
      points: number;
    }> = [];

    for (const item of dto.items) {
      if (!item?.productSlug || !item?.qty || item.qty < 1) {
        throw new BadRequestException('Bad cart item');
      }
      const { data: prod } = await this.db.from('products')
        .select('*')
        .eq('slug', item.productSlug)
        .eq('status', 'active')
        .maybeSingle();
      if (!prod) throw new NotFoundException(`Product ${item.productSlug} not available`);

      let variant: any = null;
      if (item.variantId) {
        const { data: v } = await this.db.from('product_variants')
          .select('*')
          .eq('id', item.variantId)
          .eq('product_id', prod.id)
          .maybeSingle();
        if (!v) throw new BadRequestException('Invalid variant');
        variant = v;
      }

      const cashUnit = variant?.cash_price_cents ?? prod.cash_price_cents;
      const pointsUnit = variant?.points_price ?? prod.points_price;

      let cashCents = 0;
      let points = 0;
      if (dto.paymentMode === 'points') {
        if (pointsUnit == null) throw new BadRequestException(`${prod.title} has no WP price`);
        points = pointsUnit * item.qty;
      } else if (dto.paymentMode === 'cash') {
        if (cashUnit == null) throw new BadRequestException(`${prod.title} has no cash price`);
        cashCents = cashUnit * item.qty;
      } else {
        // split — apply both halves; product metadata can override the ratio
        if (cashUnit == null || pointsUnit == null) {
          throw new BadRequestException(`${prod.title} cannot be split-purchased`);
        }
        cashCents = Math.round(cashUnit * item.qty * 0.5);
        points = Math.round(pointsUnit * item.qty * 0.5);
      }

      totalCash += cashCents;
      totalPoints += points;
      resolved.push({ product: prod, variant, qty: item.qty, cashCents, points });
    }

    // For points or split, verify balance now.
    if (totalPoints > 0) {
      const { balance } = await this.points.getBalance(userId);
      if (balance < totalPoints) {
        throw new BadRequestException(
          `Insufficient WP — you have ${balance}, need ${totalPoints}.`,
        );
      }
    }

    // Resolve redeem place if requested.
    let redeemPlaceId: string | null = null;
    if (dto.fulfillment === 'redeem_at_place' && dto.redeemPlaceSlug) {
      const { data: place } = await this.db.from('directory_listings')
        .select('id')
        .eq('slug', dto.redeemPlaceSlug)
        .maybeSingle();
      if (!place) throw new BadRequestException('Redeem place not found');
      redeemPlaceId = place.id;
    }

    // Create the order row.
    const { data: order, error: orderErr } = await this.db.from('orders')
      .insert({
        user_id: userId,
        status: totalCash > 0 ? 'pending' : 'paid', // points-only is instant
        total_cash_cents: totalCash,
        total_points: totalPoints,
        fulfillment_kind: dto.fulfillment ?? 'digital',
        redeem_place_id: redeemPlaceId,
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    // Insert items + redemption QRs.
    const orderItemRows = resolved.map((r) => ({
      order_id: order.id,
      product_id: r.product.id,
      variant_id: r.variant?.id ?? null,
      qty: r.qty,
      cash_cents: r.cashCents,
      points: r.points,
    }));
    const { data: items, error: itemsErr } = await this.db.from('order_items')
      .insert(orderItemRows)
      .select();
    if (itemsErr) throw itemsErr;

    // For physical/redeem_at_place items, mint redemption QR codes.
    const redemptions: Array<{ qrCode: string; orderItemId: string }> = [];
    for (const it of items ?? []) {
      const qr = `WCCG-${randomBytes(8).toString('hex').toUpperCase()}`;
      await this.db.from('redemptions').insert({ order_item_id: it.id, qr_code: qr });
      redemptions.push({ qrCode: qr, orderItemId: it.id });
    }

    // Debit WP immediately for points portion (idempotency key = order id + 'spend').
    if (totalPoints > 0) {
      await this.db.from('points_ledger').insert({
        user_id: userId,
        amount: -totalPoints,
        reason: 'MARKETPLACE_SPEND',
        reference_type: 'order',
        reference_id: order.id,
        balance: (await this.points.getBalance(userId)).balance - totalPoints,
        idempotency_key: `marketplace_spend:${order.id}`,
      });
    }

    // For cash portion, return a Stripe Checkout session URL.
    let stripeUrl: string | null = null;
    if (totalCash > 0) {
      stripeUrl = await this.createStripeSession(order.id, totalCash, resolved);
    } else {
      await this.db.from('orders').update({ paid_at: new Date().toISOString() }).eq('id', order.id);
    }

    return {
      orderId: order.id,
      status: order.status,
      totalCashCents: totalCash,
      totalPoints,
      stripeUrl,
      redemptions,
    };
  }

  async myOrders(userId: string) {
    const { data, error } = await this.db.from('orders')
      .select('*, order_items(*), redemptions:order_items(redemptions(qr_code, redeemed_at))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }

  // ─── Vendor redemption ──────────────────────────────────────────────────

  async redeem(scannerUserId: string, qrCode: string, placeSlug?: string) {
    if (!qrCode) throw new BadRequestException('qrCode required');
    const { data: red } = await this.db.from('redemptions')
      .select('*')
      .eq('qr_code', qrCode)
      .maybeSingle();
    if (!red) throw new NotFoundException('Unknown QR code');
    if (red.redeemed_at) {
      return { ok: false, alreadyRedeemed: true, redeemedAt: red.redeemed_at };
    }

    let placeId: string | null = null;
    if (placeSlug) {
      const { data: place } = await this.db.from('directory_listings')
        .select('id')
        .eq('slug', placeSlug)
        .maybeSingle();
      placeId = place?.id ?? null;
    }

    const { error: upErr } = await this.db.from('redemptions')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by_user_id: scannerUserId,
        redeemed_at_place_id: placeId,
      })
      .eq('id', red.id);
    if (upErr) throw upErr;

    return { ok: true };
  }

  // ─── Stripe (env-flagged stub) ──────────────────────────────────────────

  private async createStripeSession(
    orderId: string,
    totalCents: number,
    items: Array<{ product: any; qty: number; cashCents: number }>,
  ): Promise<string | null> {
    const sk = this.config.get<string>('STRIPE_SECRET_KEY');
    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? 'https://app.wccg1045fm.com';

    if (!sk) {
      // Soft mode: log and return a placeholder URL so the front-end can show
      // "Payment not configured — contact support". Order still exists.
      this.logger.warn(
        `STRIPE_SECRET_KEY not set — returning placeholder URL for order ${orderId} ($${(totalCents / 100).toFixed(2)})`,
      );
      return `${baseUrl}/marketplace/checkout/pending?order=${orderId}`;
    }

    try {
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('success_url', `${baseUrl}/marketplace/checkout/success?order=${orderId}`);
      params.append('cancel_url', `${baseUrl}/marketplace/checkout/cancel?order=${orderId}`);
      params.append('client_reference_id', orderId);
      items.forEach((it, i) => {
        if (it.cashCents <= 0) return;
        params.append(`line_items[${i}][quantity]`, String(it.qty));
        params.append(`line_items[${i}][price_data][currency]`, 'usd');
        params.append(`line_items[${i}][price_data][product_data][name]`, it.product.title);
        params.append(
          `line_items[${i}][price_data][unit_amount]`,
          String(Math.round(it.cashCents / it.qty)),
        );
      });

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sk}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        this.logger.warn(`Stripe ${res.status}: ${await res.text()}`);
        return null;
      }
      const session = (await res.json()) as { id: string; url: string };
      await this.db.from('orders')
        .update({ stripe_session_id: session.id })
        .eq('id', orderId);
      return session.url ?? null;
    } catch (e) {
      this.logger.warn(`Stripe call failed: ${(e as Error).message}`);
      return null;
    }
  }

  // ─── helpers ────────────────────────────────────────────────────────────

  private mapProduct = (p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    kind: p.kind,
    coverUrl: p.cover_url ?? null,
    cashPriceCents: p.cash_price_cents,
    pointsPrice: p.points_price,
    stock: p.stock,
    status: p.status,
  });
}
