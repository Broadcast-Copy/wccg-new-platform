import { Controller, Get } from '@nestjs/common';
import { StreamService } from './stream.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Public()
  @Get('now-playing')
  async getNowPlaying() {
    return this.streamService.getNowPlaying();
  }
}
