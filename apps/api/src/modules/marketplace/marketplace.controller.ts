import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/**
 * Marketplace — Phase B (B5).
 *
 * Hybrid cash + WP economy. A product can have:
 *   - cash_price_cents only        → cash purchase (Stripe)
 *   - points_price only            → WP-only redemption
 *   - both                         → buyer chooses, or splits per product config
 */
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly market: MarketplaceService) {}

  /** GET /marketplace/products — public storefront. */
  @Public()
  @Get('products')
  list(
    @Query('kind') kind?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return this.market.listProducts({ kind, search, limit });
  }

  /** GET /marketplace/products/:slug — public detail. */
  @Public()
  @Get('products/:slug')
  detail(@Param('slug') slug: string) {
    return this.market.getProduct(slug);
  }

  /**
   * POST /marketplace/checkout — create an order.
   * Body: { items: [{ productSlug, variantId?, qty }], paymentMode: 'cash' | 'points' | 'split' }
   *
   * For cash/split: returns a Stripe Checkout session URL (or stub URL when not configured).
   * For points: debits the ledger immediately, returns the order with redemption QRs.
   */
  @Post('checkout')
  checkout(
    @CurrentUser() user: SupabaseUser,
    @Body()
    dto: {
      items: Array<{ productSlug: string; variantId?: string; qty: number }>;
      paymentMode: 'cash' | 'points' | 'split';
      fulfillment?: 'digital' | 'pickup' | 'ship' | 'redeem_at_place';
      redeemPlaceSlug?: string;
    },
  ) {
    return this.market.checkout(user.sub, dto);
  }

  /** GET /marketplace/orders — current user's orders. */
  @Get('orders')
  myOrders(@CurrentUser() user: SupabaseUser) {
    return this.market.myOrders(user.sub);
  }

  /**
   * POST /marketplace/redeem — vendor scans a QR. Marks order_item redeemed.
   * Body: { qrCode, placeSlug? }
   */
  @Post('redeem')
  redeem(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: { qrCode: string; placeSlug?: string },
  ) {
    return this.market.redeem(user.sub, dto.qrCode, dto.placeSlug);
  }
}
