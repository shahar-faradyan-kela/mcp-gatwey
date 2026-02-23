import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}
