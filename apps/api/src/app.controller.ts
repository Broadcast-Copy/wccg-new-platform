import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET / — Root health check (public).
   */
  @Public()
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
