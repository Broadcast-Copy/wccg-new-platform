import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RestreamService } from './restream.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Restream destinations — YouTube Live, Twitch, Facebook, Discord, custom RTMP.
 *
 *   GET    /restream                          (admin)   list destinations + status
 *   POST   /restream                          (admin)   create new destination
 *   PATCH  /restream/:id                      (admin)   update fields
 *   PATCH  /restream/:id/toggle               (admin)   enable/disable
 *   DELETE /restream/:id                      (admin)   remove
 *   GET    /restream/:id/events?limit=        (admin)   recent worker events
 *
 *   GET    /restream/agent/destinations       (bearer)  worker — full secrets
 *   POST   /restream/agent/events             (bearer)  worker — record event
 */
@Controller('restream')
export class RestreamController {
  constructor(private readonly svc: RestreamService) {}

  @Roles('admin')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('admin')
  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Roles('admin')
  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    return this.svc.toggle(id, body?.enabled === true);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Roles('admin')
  @Get(':id/events')
  events(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.recentEvents(id, Number(limit) || 50);
  }

  // ─── Worker (bearer-auth, RESTREAM_AGENT_TOKEN) ──────────────────────

  @Public()
  @Get('agent/destinations')
  agentDestinations(@Headers('authorization') auth?: string) {
    this.svc.requireAgentToken(auth);
    return this.svc.agentDestinations();
  }

  @Public()
  @Post('agent/events')
  agentEvent(
    @Headers('authorization') auth: string | undefined,
    @Body() body: {
      destinationId: string;
      eventType: 'start' | 'stop' | 'heartbeat' | 'error' | 'reconnect';
      status?: string;
      message?: string;
      bitrateKbps?: number;
      fps?: number;
      bytesOut?: number;
    },
  ) {
    this.svc.requireAgentToken(auth);
    return this.svc.recordEvent(body);
  }
}
